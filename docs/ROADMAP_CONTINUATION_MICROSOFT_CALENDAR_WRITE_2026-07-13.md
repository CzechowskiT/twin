# Roadmap continuation — Microsoft calendar write (post-stable)

> **Status:** SPEC ONLY · **Implementation:** blocked until Gate F + stable release  
> **North star:** acceptance-ready calendar slots — not volume noise

## Scope (future)

- OAuth write scope for Microsoft Graph calendar events  
- Interview hold proposals with Teams link metadata  
- Busy-read already shipped; write is separate gate

## Preconditions

1. Gate F closure + founder smoke PASS on calendar flows  
2. `microsoft_calendar_write_enabled` feature flag audit (#459)  
3. Privacy review for corporate tenant data

## Out of scope (this train)

- No LIVE flip · no production downgrade · no auto-book without consent
