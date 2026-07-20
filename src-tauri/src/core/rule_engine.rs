// Rule engine — condition/action pairs
// Phase 3 implementation

pub struct Rule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub conditions: Vec<Condition>,
    pub actions: Vec<Action>,
}

pub enum Condition {
    Extension(String),
    Name(String),
    Size { operator: String, value: u64 },
    DateCreated(String),
    DateModified(String),
}

pub enum Action {
    Move { destination: String },
    Copy { destination: String },
    Rename { pattern: String },
}

pub fn evaluate(_file_path: &str, _rule: &Rule) -> bool {
    // TODO: Phase 3
    false
}
