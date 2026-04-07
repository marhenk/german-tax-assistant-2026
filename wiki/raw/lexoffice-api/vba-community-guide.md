# Lexoffice API Access via VBA (German Community Guide)

*Fetched: 2025-05-27 | Source: https://access-im-unternehmen.de/Zugriff_auf_lexoffice_per_RESTAPI_und_VBA/ | Reliability: ⭐⭐*

## Authentication

1. **Generate API key**: `https://app.lexoffice.de/addons/public-api`
2. **Store in VBA**: `Public Const cstrAPIKey As String = "xxxxxxxxxxx-xxxxxxxx-xxxx"`

## VBA References Required

- Microsoft XML, v6.0
- Microsoft Scripting Runtime
- Microsoft ActiveX Data Objects 6.1 Library (for URL encoding)

## Base Request Function

```vba
Public Function Request(strRequest As String, strURL As String, strMethod As String, strResponse As String) As Boolean
    Dim objXMLHTTP As MSXML2.XMLHTTP60
    Set objXMLHTTP = New MSXML2.XMLHTTP60
    With objXMLHTTP
        .Open strMethod, strURL, False
        .setRequestHeader "Content-Type", "application/json"
        .setRequestHeader "Accept", "application/json"
        .setRequestHeader "Authorization", "Bearer " + cstrAPIKey
        .send strRequest
        Select Case .status
            Case 200
                Request = True
                strResponse = .responseText
            Case Else
                MsgBox "Fehler beim Request:" & vbCrLf & .statusText & vbCrLf & .responseText
        End Select
    End With
End Function
```

## Common Patterns

### Retrieve All Contacts
```vba
strURL = "https://api.lexoffice.io/v1/contacts"
If Request(strURL, "GET", strRequest, strResponse) = True Then
    Debug.Print strResponse
End If
```

### Filter by Email
```vba
strURL = "https://api.lexoffice.io/v1/contacts?email=andre@minhorst.com"
```

### Filter by Name (with special chars)
```vba
strURL = "https://api.lexoffice.io/v1/contacts?name=" & URLEncode_UTF8("André")
```

### Retrieve by ID
```vba
strURL = "https://api.lexoffice.io/v1/contacts/xxxxxxxx-ee3a-421a-9850-1fce2d01c8f0"
' Returns single contact object (not wrapped in "content" array)
```

## Create/Update Contact (Person)

**Key insight**: lexoffice doesn't accept custom customer numbers via API.  
**Workaround**: Store lexoffice `id` in local DB field `LexOfficeID`, store local customer number in `note` field.

```vba
Public Function AddOrUpdateContact_Person(..., strID As String)
    strURL = "https://api.lexoffice.io/v1/contacts"
    If Len(strID) = 0 Then
        strMethod = "POST"  ' New contact
    Else
        strMethod = "PUT"   ' Update existing
        strURL = strURL & "/" & strID
        intVersion = GetContactVersion(strID)  ' Fetch current version for optimistic locking
    End If
    
    ' Build JSON request body
    strRequest = "{" & vbCrLf
    strRequest = strRequest & " ""version"": " & IIf(Len(strID) = 0, 0, intVersion) & "," & vbCrLf
    strRequest = strRequest & " ""roles"": {""customer"": {}}," & vbCrLf
    strRequest = strRequest & " ""person"": {" & vbCrLf
    ' ... (full JSON construction)
    strRequest = strRequest & " ""note"":""" & strCustomerID & """" & vbCrLf  ' Local customer number!
    strRequest = strRequest & "}"
    
    If Request(strURL, strMethod, strRequest, strResponse) Then
        Set objJSON = ParseJson(strResponse)
        strID = objJSON.Item("id")  ' Return lexoffice ID to store in local DB
    End If
End Function
```

### Get Contact Version (for PUT)
```vba
Public Function GetContactVersion(strID As String) As Integer
    strURL = "https://api.lexoffice.io/v1/contacts/" & strID
    If Request(strURL, "GET", strRequest, strResponse) Then
        Set objJSON = ParseJson(strResponse)
        GetContactVersion = objJSON.Item("version")
    End If
End Function
```

## JSON Structure Differences

**Filtered/All contacts**:
```json
{
  "content": [
    {
      "id": "...",
      "person": {"lastName": "..."}
    }
  ]
}
```
Access: `objJSON.Item("content").Item(3).Item("person").Item("lastName")`

**Single contact by ID**:
```json
{
  "id": "...",
  "person": {"lastName": "..."}
}
```
Access: `objJSON.Item("person").Item("lastName")`

## Key Learnings

1. **Custom customer numbers**: Not supported via API. Use `note` field + `id` mapping.
2. **Version management**: Always fetch current `version` before PUT.
3. **URL encoding**: Required for special characters in filter parameters.
4. **JSON structure varies**: All/filtered vs. single-by-ID return different structures.
5. **Email arrays**: Multiple emails per type (business, office, private, other).
6. **Address types**: billing vs. shipping, both as arrays.

## Related
- [[calculations/ust.md]] (tax handling)
- [[edge-cases/duplicate-detection.md]] (ID mapping strategy)
