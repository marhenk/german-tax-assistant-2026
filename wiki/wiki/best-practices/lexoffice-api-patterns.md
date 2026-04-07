# Lexoffice API Patterns

*Updated: 2025-05-27 | Source: Community + Official Docs | Reliability: ⭐⭐⭐⭐*

## Summary
Best practices for integrating Lexoffice API with external systems (Access DB, custom tools). Rate limits, error handling, ID mapping.

## Legal Basis
- No legal requirement (technical best practice)
- Must comply with GDPR (data access logging)

## Rules
### Rate Limits
- **2 requests/second** (token bucket algorithm)
- **Handle 429**: Exponential backoff (wait 2s, 4s, 8s, ...)
- **Batch operations**: Group related requests (e.g., create contact → create invoice)
- **Cache aggressively**: Avoid re-fetching unchanged data (use `version` for change detection)

### Error Handling
- **200 OK**: Success, proceed
- **400 Bad Request**: Invalid JSON/parameters → log request, fix schema
- **404 Not Found**: Resource doesn't exist → check ID, may have been deleted
- **406 Not Acceptable**: Invalid pursue action (e.g., credit note chain) → validate workflow
- **429 Too Many Requests**: Rate limit exceeded → exponential backoff
- **500 Internal Server Error**: Lexoffice issue → retry with backoff (max 3 attempts)

### ID Mapping (Critical)
**Problem**: Lexoffice generates its own IDs, doesn't accept custom customer numbers.

**Solution**: Bidirectional mapping
1. **Local DB → Lexoffice**: Store `LexofficeID` in customer table
2. **Lexoffice → Local DB**: Store local customer number in Lexoffice `note` field
3. **Lookup both ways**: Search by email/name if ID not stored

```
Local Customer Table:
CustomerID | Name | Email | LexofficeID
1001 | Alice | alice@... | a1b2c3-...
1002 | Bob | bob@... | d4e5f6-...

Lexoffice Contact:
id: a1b2c3-...
person: {firstName: "Alice", ...}
note: "1001"  ← Store local CustomerID here
```

### Optimistic Locking
- **Always fetch `version`** before PUT
- **Increment `version`** on each update
- **Handle conflict**: If 409 Conflict → re-fetch latest version, merge changes, retry

### Authentication
- **Bearer token**: Store API key securely (not in code)
- **Environment variable**: `LEXOFFICE_API_KEY` (not committed to Git)
- **Rotate keys**: If compromised, regenerate at https://app.lexoffice.de/addons/public-api

## Edge Cases
- **Concurrent updates**: Two processes update same contact → 409 Conflict → optimistic locking prevents data loss
- **Deleted resources**: Contact deleted in Lexoffice → 404 on next GET → mark as deleted locally
- **Email filtering wildcards**: `a_b@example.com` matches `a.b@example.com` → may return unexpected results (see [[raw/lexoffice-api/lexware-api-docs]])
- **JSON structure varies**: Single contact by ID ≠ filtered contacts (no `content` wrapper) → handle both

## Counter-Arguments
- **"Just use manual export"**: Scales poorly, error-prone, no automation → API is better long-term

## Examples
### Rate Limit Handling (Exponential Backoff)
```python
import time

def request_with_backoff(url, method, data, max_retries=5):
    for attempt in range(max_retries):
        response = requests.request(method, url, json=data, headers=auth_headers)
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 429:
            wait = 2 ** attempt  # 1s, 2s, 4s, 8s, 16s
            print(f"Rate limited, waiting {wait}s...")
            time.sleep(wait)
        else:
            raise Exception(f"API error {response.status_code}: {response.text}")
    
    raise Exception("Max retries exceeded")
```

### ID Mapping (Create Contact)
```python
def create_or_update_contact(local_customer):
    # 1. Check if already exists (via LexofficeID)
    if local_customer.lexoffice_id:
        url = f"https://api.lexoffice.io/v1/contacts/{local_customer.lexoffice_id}"
        method = "PUT"
        version = get_contact_version(local_customer.lexoffice_id)  # Fetch latest
    else:
        url = "https://api.lexoffice.io/v1/contacts"
        method = "POST"
        version = 0
    
    # 2. Build JSON payload
    payload = {
        "version": version,
        "roles": {"customer": {}},
        "person": {
            "firstName": local_customer.first_name,
            "lastName": local_customer.last_name
        },
        "note": str(local_customer.id)  # Store local CustomerID
    }
    
    # 3. Send request
    response = request_with_backoff(url, method, payload)
    
    # 4. Store Lexoffice ID locally
    if method == "POST":
        local_customer.lexoffice_id = response["id"]
        db.save(local_customer)
    
    return response
```

### Optimistic Locking
```python
def update_contact_safe(lexoffice_id, updates):
    # 1. Fetch current version
    contact = get_contact(lexoffice_id)
    current_version = contact["version"]
    
    # 2. Apply updates
    updated = {**contact, **updates, "version": current_version}
    
    # 3. Try PUT
    try:
        response = request_with_backoff(
            f"https://api.lexoffice.io/v1/contacts/{lexoffice_id}",
            "PUT",
            updated
        )
        return response
    except Conflict409:
        # Another process updated the contact
        print("Conflict detected, re-fetching...")
        return update_contact_safe(lexoffice_id, updates)  # Retry
```

### Batch Operations (Respect Rate Limit)
```python
def import_customers(customers, batch_size=5):
    for i in range(0, len(customers), batch_size):
        batch = customers[i:i+batch_size]
        
        for customer in batch:
            create_or_update_contact(customer)
            time.sleep(0.5)  # 2 req/sec = 0.5s between requests
        
        # Batch complete, 5-second break
        print(f"Batch {i//batch_size + 1} complete, pausing 5s...")
        time.sleep(5)
```

### Lookup by Email (If No ID)
```python
def find_contact_by_email(email):
    url = f"https://api.lexoffice.io/v1/contacts?email={urllib.parse.quote(email)}"
    response = request_with_backoff(url, "GET", None)
    
    if response["totalElements"] == 0:
        return None  # Not found
    elif response["totalElements"] == 1:
        return response["content"][0]  # Found
    else:
        # Multiple matches (e.g., email wildcards)
        print(f"Warning: {response['totalElements']} contacts match {email}")
        return response["content"][0]  # Return first, flag for review
```

## Security
- **API key in environment variable**: `export LEXOFFICE_API_KEY="..."`
- **Never log API keys**: Redact from logs (replace with `***`)
- **HTTPS only**: API enforces TLS, but verify cert
- **GDPR**: Log API access (who, when, what data) for audit trail

## Monitoring
- **Track 429s**: If frequent → reduce request rate
- **Track 5xx errors**: If increasing → Lexoffice incident (check status page)
- **Track latency**: If >2s consistently → investigate network/API performance

## Sources
- [[raw/lexoffice-api/lexware-api-docs]] (official API docs)
- [[raw/lexoffice-api/vba-community-guide]] (VBA examples)
- Token bucket algorithm: https://en.wikipedia.org/wiki/Token_bucket

## Related
- [[edge-cases/duplicate-detection]] (prevent duplicate imports)
- [[best-practices/validation-checks]] (validate before API submission)
- [[calculations/ust]] (tax type mapping)

## Confidence
⭐⭐⭐⭐ Official API docs + community validation (rate limits/error codes confirmed)
