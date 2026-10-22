//! The JavaScript readings of values the board has always made: `String(v)`,
//! truthiness, `===`, `JSON.stringify(v, null, 2)`, whole numbers as
//! integers, UTF-16 lengths and ISO times.

use serde_json::{Number, Value};

/// `String(value)`: what a template literal prints.
pub fn to_string(value: &Value) -> String {
    match value {
        Value::Null => "null".to_owned(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.as_f64().map_or_else(String::new, number_to_string),
        Value::String(s) => s.clone(),
        Value::Array(items) => items
            .iter()
            .map(|item| {
                if item.is_null() {
                    String::new()
                } else {
                    to_string(item)
                }
            })
            .collect::<Vec<_>>()
            .join(","),
        Value::Object(_) => "[object Object]".to_owned(),
    }
}

/// `String(value)` of a property that may be `undefined`.
pub fn display(value: Option<&Value>) -> String {
    value.map_or_else(|| "undefined".to_owned(), to_string)
}

/// Whether JavaScript treats `value` as true.
pub fn truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0 && !f.is_nan()),
        Value::String(s) => !s.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

/// `a === b`; objects are never the same object here, so never equal.
pub fn strict_equals(a: Option<&Value>, b: Option<&Value>) -> bool {
    match (a, b) {
        (None, None) | (Some(Value::Null), Some(Value::Null)) => true,
        (Some(Value::Bool(x)), Some(Value::Bool(y))) => x == y,
        (Some(Value::Number(x)), Some(Value::Number(y))) => x.as_f64() == y.as_f64(),
        (Some(Value::String(x)), Some(Value::String(y))) => x == y,
        _ => false,
    }
}

/// A JSON number for `n`, a whole number as an integer.
pub fn num(n: f64) -> Value {
    if n.fract() == 0.0 && n.abs() <= 9_007_199_254_740_991.0 {
        return Value::from(n as i64);
    }
    Number::from_f64(n).map_or(Value::Null, Value::Number)
}

/// A string's length in UTF-16 units.
pub fn utf16_len(text: &str) -> usize {
    text.chars().map(char::len_utf16).sum()
}

/// The first `units` UTF-16 units of `text`, never splitting a character.
pub fn head(text: &str, units: usize) -> &str {
    let mut seen = 0;
    for (i, c) in text.char_indices() {
        seen += c.len_utf16();
        if seen > units {
            return &text[..i];
        }
    }
    text
}

/// `JSON.stringify(value, null, 2)`.
pub fn pretty(value: &Value) -> String {
    let mut out = String::new();
    write(value, 0, &mut out);
    out
}

fn write(value: &Value, depth: usize, out: &mut String) {
    let (open, close, entries): (char, char, Vec<(Option<&str>, &Value)>) = match value {
        Value::Null => return out.push_str("null"),
        Value::Bool(b) => return out.push_str(if *b { "true" } else { "false" }),
        Value::Number(n) => {
            return out.push_str(&match n.as_f64() {
                Some(f) if f.is_finite() => number_to_string(f),
                _ => "null".to_owned(),
            })
        }
        Value::String(s) => return quote(s, out),
        Value::Array(items) => ('[', ']', items.iter().map(|v| (None, v)).collect()),
        Value::Object(map) => (
            '{',
            '}',
            map.iter().map(|(k, v)| (Some(k.as_str()), v)).collect(),
        ),
    };
    out.push(open);
    if entries.is_empty() {
        out.push(close);
        return;
    }
    for (i, (key, item)) in entries.into_iter().enumerate() {
        if i > 0 {
            out.push(',');
        }
        newline(depth + 1, out);
        if let Some(key) = key {
            quote(key, out);
            out.push_str(": ");
        }
        write(item, depth + 1, out);
    }
    newline(depth, out);
    out.push(close);
}

fn newline(depth: usize, out: &mut String) {
    out.push('\n');
    out.extend(std::iter::repeat_n(' ', 2 * depth));
}

/// A string as `JSON.stringify` quotes it.
fn quote(s: &str, out: &mut String) {
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
}

/// `Number.prototype.toString()`: the shortest digits that read back as the
/// same double, laid out as ECMAScript lays them out.
fn number_to_string(x: f64) -> String {
    if x.is_nan() {
        return "NaN".to_owned();
    }
    if x == 0.0 {
        return "0".to_owned();
    }
    if x.is_infinite() {
        return if x > 0.0 { "Infinity" } else { "-Infinity" }.to_owned();
    }
    let mut out = String::new();
    if x < 0.0 {
        out.push('-');
    }
    // `{:e}` writes the shortest round-trip digits, as `d.ddde±x`.
    let scientific = format!("{:e}", x.abs());
    let Some((mantissa, exponent)) = scientific.split_once('e') else {
        return scientific;
    };
    let Ok(exponent) = exponent.parse::<i64>() else {
        return scientific;
    };
    let digits: String = mantissa.chars().filter(|c| *c != '.').collect();
    let k = digits.len() as i64;
    let n = exponent + 1;
    if k <= n && n <= 21 {
        out.push_str(&digits);
        out.extend(std::iter::repeat_n('0', (n - k) as usize));
    } else if 0 < n && n <= 21 {
        let (int, frac) = digits.split_at(n as usize);
        out.push_str(int);
        out.push('.');
        out.push_str(frac);
    } else if -6 < n && n <= 0 {
        out.push_str("0.");
        out.extend(std::iter::repeat_n('0', (-n) as usize));
        out.push_str(&digits);
    } else {
        let e = n - 1;
        let (first, rest) = digits.split_at(1);
        out.push_str(first);
        if !rest.is_empty() {
            out.push('.');
            out.push_str(rest);
        }
        out.push('e');
        out.push(if e < 0 { '-' } else { '+' });
        out.push_str(&e.abs().to_string());
    }
    out
}

/// `ms` since the Unix epoch as `YYYY-MM-DDTHH:MM:SS.mmmZ`, as `Date#toISOString` writes it.
pub fn iso(ms: i64) -> String {
    let (days, in_day) = (ms.div_euclid(86_400_000), ms.rem_euclid(86_400_000));
    // Howard Hinnant's days-to-civil, for the proleptic Gregorian calendar.
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    let (h, m, s, milli) = (
        in_day / 3_600_000,
        in_day / 60_000 % 60,
        in_day / 1000 % 60,
        in_day % 1000,
    );
    format!("{year:04}-{month:02}-{day:02}T{h:02}:{m:02}:{s:02}.{milli:03}Z")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn times_read_as_iso_strings() {
        assert_eq!(iso(0), "1970-01-01T00:00:00.000Z");
        assert_eq!(iso(951_782_400_000), "2000-02-29T00:00:00.000Z");
        assert_eq!(iso(1_767_225_599_999), "2025-12-31T23:59:59.999Z");
        assert_eq!(iso(-1), "1969-12-31T23:59:59.999Z");
    }

    #[test]
    fn values_read_as_javascript_reads_them() {
        assert_eq!(to_string(&serde_json::json!(3.0)), "3");
        assert_eq!(to_string(&serde_json::json!(null)), "null");
        assert!(!truthy(&serde_json::json!("")));
        assert_eq!(head("a😀b", 2), "a");
        assert_eq!(num(2.0), serde_json::json!(2));
        assert_eq!(to_string(&serde_json::json!(1e21)), "1e+21");
        assert_eq!(to_string(&serde_json::json!(0.000001)), "0.000001");
        assert_eq!(to_string(&serde_json::json!([1, null, "a"])), "1,,a");
        assert_eq!(display(None), "undefined");
    }

    #[test]
    fn pretty_writes_as_json_stringify_indents() {
        let value = serde_json::json!({ "a": [1.5, {}], "b": "q\"\n\u{1}", "c": [] });
        assert_eq!(
            pretty(&value),
            "{\n  \"a\": [\n    1.5,\n    {}\n  ],\n  \"b\": \"q\\\"\\n\\u0001\",\n  \"c\": []\n}"
        );
    }

    #[test]
    fn strict_equality_never_holds_between_objects_or_kinds() {
        let one = serde_json::json!(1);
        assert!(strict_equals(Some(&one), Some(&serde_json::json!(1.0))));
        assert!(!strict_equals(Some(&one), Some(&serde_json::json!("1"))));
        assert!(!strict_equals(
            Some(&serde_json::json!({})),
            Some(&serde_json::json!({}))
        ));
        assert!(strict_equals(None, None));
    }
}
