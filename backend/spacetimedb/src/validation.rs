pub(crate) fn claim_rewards_once(claimed: &mut bool) -> Result<(), String> {
    if *claimed {
        return Err("match rewards have already been claimed".to_string());
    }
    *claimed = true;
    Ok(())
}

pub(crate) fn dev_grants_enabled() -> bool {
    false
}

pub(crate) fn match_has_capacity(already_in_match: bool, connected_players: u32, max_players: u32) -> bool {
    already_in_match || connected_players < max_players
}

pub(crate) fn finite(value: f32, label: &str) -> Result<f32, String> {
    if value.is_finite() {
        Ok(value)
    } else {
        Err(format!("{label} must be finite"))
    }
}

pub(crate) fn clamp_finite(value: f32, min: f32, max: f32, label: &str) -> Result<f32, String> {
    Ok(finite(value, label)?.min(max).max(min))
}

#[cfg(test)]
mod tests {
    use super::{claim_rewards_once, clamp_finite, dev_grants_enabled, finite, match_has_capacity};

    #[test]
    fn rewards_can_only_be_claimed_once() {
        let mut claimed = false;
        assert!(claim_rewards_once(&mut claimed).is_ok());
        assert!(claim_rewards_once(&mut claimed).is_err());
    }

    #[test]
    fn development_grants_are_disabled_by_default() {
        assert!(!dev_grants_enabled());
    }

    #[test]
    fn full_matches_reject_new_players_but_allow_reconnects() {
        assert!(!match_has_capacity(false, 8, 8));
        assert!(match_has_capacity(true, 8, 8));
        assert!(match_has_capacity(false, 7, 8));
    }

    #[test]
    fn input_validation_rejects_non_finite_values_and_clamps_finite_values() {
        assert!(finite(f32::NAN, "angle").is_err());
        assert!(finite(f32::INFINITY, "angle").is_err());
        assert_eq!(clamp_finite(2.0, -1.0, 1.0, "move").unwrap(), 1.0);
        assert_eq!(clamp_finite(-2.0, -1.0, 1.0, "move").unwrap(), -1.0);
    }
}
