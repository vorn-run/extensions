//! What the task tools are written with: their parsed arguments and the
//! shapes of an answer, worded as Vorn's own tools word theirs.

use serde_json::{json, Map, Value};

use crate::js;

/// A tool's answer, or the message of what it threw.
pub type Outcome = Result<Value, String>;

/// A tool's parsed arguments: an object, or nothing for a tool without a schema.
pub struct Args(Map<String, Value>);

impl Args {
    pub fn new(value: Option<Value>) -> Args {
        match value {
            Some(Value::Object(map)) => Args(map),
            _ => Args(Map::new()),
        }
    }

    /// Argument `key`, `None` when it was not given.
    pub fn get(&self, key: &str) -> Option<&Value> {
        self.0.get(key)
    }

    pub fn str(&self, key: &str) -> Option<&str> {
        self.0.get(key).and_then(Value::as_str)
    }

    /// Whether argument `key` is truthy.
    pub fn truthy(&self, key: &str) -> bool {
        self.0.get(key).is_some_and(js::truthy)
    }

    /// A string argument when it is set and not empty.
    pub fn nonempty(&self, key: &str) -> Option<&str> {
        self.str(key).filter(|s| !s.is_empty())
    }
}

/// An object of the entries that are set, in order; unset ones are left out.
pub fn object<'k>(entries: impl IntoIterator<Item = (&'k str, Option<Value>)>) -> Value {
    Value::Object(
        entries
            .into_iter()
            .filter_map(|(k, v)| v.map(|v| (k.to_owned(), v)))
            .collect(),
    )
}

/// A result of one text block.
pub fn text(text: impl Into<String>) -> Value {
    json!({ "content": [{ "type": "text", "text": text.into() }] })
}

/// A result of one text block, marked as an error.
pub fn failed(text: impl Into<String>) -> Value {
    json!({ "content": [{ "type": "text", "text": text.into() }], "isError": true })
}

/// A result of one text block holding `value` as indented JSON.
pub fn pretty(value: &Value) -> Value {
    text(js::pretty(value))
}

/// `value` as an array to walk: anything that is not one walks as empty.
pub fn items(value: Option<&Value>) -> &[Value] {
    value.and_then(Value::as_array).map_or(&[], Vec::as_slice)
}

/// A failed call's message as a tool passes it on: a server without the
/// method is older than the caller, and says so.
pub fn answered(message: &str) -> String {
    let Some(method) = message.strip_prefix("Method not found:") else {
        return message.to_owned();
    };
    format!(
        "This server does not have {}, so it is older than the vorn command asking for it.\n\
         Restart Vorn to pick up the newer server, or run this against the matching build.",
        method.trim()
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_missing_method_reads_as_an_older_server() {
        assert_eq!(answered("no such task"), "no such task");
        assert!(answered("Method not found: task.get")
            .starts_with("This server does not have task.get,"));
    }

    #[test]
    fn unset_entries_are_left_out_in_order() {
        let made = object([("b", Some(json!(1))), ("a", None), ("c", Some(json!(2)))]);
        assert_eq!(serde_json::to_string(&made).unwrap(), r#"{"b":1,"c":2}"#);
    }
}
