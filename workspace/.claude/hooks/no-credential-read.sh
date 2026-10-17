#!/usr/bin/env bash
# PreToolUse guard (D-592): no session reads the Windows Credential Manager.
#
# The seeded bench account's password (estimator@bench.intelcost.io) is the founder's alone: he
# resets it himself (Forgot password, through MailHog), and no session knows it, asks for it or
# signs in as that account (D-601). So no command here may read a stored credential: the Windows
# credential API (CredRead, CredEnumerate), the PowerShell modules that wrap it, `vaultcmd`, or
# anything naming the old entry. Listing with `cmdkey /list` shows names only and stays allowed.
#
# Reads the tool call as JSON on stdin and blocks (exit 2, reason on stderr) on a match.

input=$(cat)
pattern='CredRead|CredEnumerate|CredentialManager|StoredCredential|PasswordVault|vaultcmd|IntelCost bench - estimator'

if printf '%s' "$input" | grep -Eiq "$pattern"; then
  cat >&2 <<'MSG'
Blocked (D-592): sessions never read the Windows Credential Manager. The seeded bench
account's password is the founder's alone; no session signs in as that account.
MSG
  exit 2
fi
exit 0
