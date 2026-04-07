# Lexoffice API Documentation (Lexware)

*Fetched: 2025-05-27 | Source: https://developers.lexware.io/docs/ | Reliability: ⭐⭐⭐⭐*

## Rate Limits

- **2 requests per second** (token bucket algorithm)
- Handle 429 responses with exponential backoff
- Avoid tight loops; serialize bursts

## Key Endpoints

### Articles
- `GET /v1/articles` - List articles
- `POST /v1/articles` - Create article
- `PUT /v1/articles/{id}` - Update article
- `DELETE /v1/articles/{id}` - Delete article

### Contacts
- `GET /v1/contacts` - List contacts (filterable: email, name, number, customer, vendor)
- `POST /v1/contacts` - Create contact
- `PUT /v1/contacts/{id}` - Update contact
- Filter examples:
  - `?email=test@example.com`
  - `?name=Mustermann` (min 3 chars)
  - `?number=10001`
  - `?customer=true&vendor=false`

### Credit Notes
- `POST /v1/credit-notes[?finalize=true]` - Create credit note
- Related to invoices (immediately paidoff when finalized)
- Tax types: net, gross, vatfree, intraCommunitySupply, constructionService13b, etc.

### Invoices (Lexware specific)
- Similar structure to credit notes
- Electronic document profiles: NONE, EN16931 (ZUGFeRD), XRechnung

## Common Patterns

### Authentication
```
Authorization: Bearer {accessToken}
Content-Type: application/json
Accept: application/json
```

### Optimistic Locking
- Every resource has a `version` field (integer)
- Increment on each update
- Prevents concurrent modification conflicts

### Pagination
- Default page size: 25
- Parameters: `?page=0`
- Response includes: `totalPages`, `totalElements`, `first`, `last`, `numberOfElements`

### Address Structure
```json
{
  "name": "Company Name",
  "supplement": "Building 10",
  "street": "Musterstraße 42",
  "zip": "79112",
  "city": "Freiburg",
  "countryCode": "DE"
}
```

### Tax Rates (2024)
- 0%, 7%, 19% (Germany)
- See countries endpoint for tax classification: `de`, `intraCommunity`, `thirdPartyCountry`

## Error Handling

- **200**: Success
- **429**: Rate limit exceeded (retry with backoff)
- **404**: Resource not found
- **406**: Invalid pursue action (e.g., credit note chain violation)

## Edge Cases

### Email Filtering
- Pattern matching: `a_b@example.com` matches `a.b@example.com`, `a_b@example.com`, `azb@example.com`
- Escaped: `a\_b@example.com` matches only exact
- Wildcard: `a%b@example` matches `anna.and.jacob@example.com`

### Contact Types
- **Person**: `person` object with `firstName`, `lastName`, `salutation`
- **Company**: `company` object with `name`, `taxNumber`, `vatRegistrationId`, `contactPersons`

### XRechnung
- `buyerReference` (Leitweg-ID) requires `vendorNumberAtCustomer`

## Best Practices

1. **Batch operations**: Group multiple updates to respect rate limits
2. **Idempotency**: Use PUT with `version` for updates
3. **Reference existing data**: Use `id` for articles/contacts in line items
4. **Version tracking**: Always fetch current `version` before PUT

## Related
- [[best-practices/lexoffice-api-patterns.md]] (VBA examples)
- [[edge-cases/missing-ust.md]] (tax handling)
