-- Early builds stored some jsonb values as JSON-encoded strings ("{\"a\":1}" instead of {"a":1}).
-- Unwrap them in place; rows that are already proper JSON are untouched.

update cases set answers = (answers #>> '{}')::jsonb where jsonb_typeof(answers) = 'string';

update onboarding_templates set steps = (steps #>> '{}')::jsonb where jsonb_typeof(steps) = 'string';
update onboarding_templates set required_assets = (required_assets #>> '{}')::jsonb where jsonb_typeof(required_assets) = 'string';
update onboarding_templates set contract = (contract #>> '{}')::jsonb where jsonb_typeof(contract) = 'string';
