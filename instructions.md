Do the following:

Create a .gitignore  
Create a .env.example  

Inside .env.example, add the following

HONORLOCK_CLIENT_ID=
HONORLOCK_CLIENT_SECRET=

We'll put .env in .gitignore so it won't be available in git. I will manually populate .env with the appropriate values.

When the root page request comes in, we need to do a series of API requests to Honorlock's API. I'm going to provide curl equivalents, but we'll obviously want to use node's native fetch (which we can now use because we're using node v20+).

```curl
curl --location 'https://app.honorlock.com/api/en/v1/token' \
--header 'Content-Type: application/json' \
--data '{
    "client_id": "{HONORLOCK_CLIENT_ID}",
    "client_secret": "{HONORLOCK_CLIENT_SECRET}"
}'
```

The response to that will looks like this:

```
{
    "data": {
        "token_type": "Bearer",
        "access_token": "{redacted}",
        "expires_in": 76268,
        "created_at": "2025-04-08T17:31:59.000000Z",
        "expires_at": "2025-04-09T17:31:59.000000Z"
    }
}
```

We need to extract the access_token from there and store it as accessToken. We can now make the next request:

```curl
curl --location 'https://app.honorlock.com/api/en/v1/courses' \
--header 'Authorization: Bearer {accessToken}'
```
The response will look like this:

```json
{
    "data": [
        {
            "uuid": "c4a990d6-a6c1-466d-9cdb-2c81f26a91bd",
            "external_id": null,
            "name": "Honolock Test",
            "crn": "Test 100",
            "created_at": "2025-04-08T15:58:52.000000Z",
            "updated_at": "2025-04-08T15:58:52.000000Z"
        }
    ],
    "links": {
        "first": "https://app.honorlock.com/api/en/v1/courses?page=1",
        "last": "https://app.honorlock.com/api/en/v1/courses?page=1",
        "prev": null,
        "next": null
    },
    "meta": {
        "current_page": 1,
        "from": 1,
        "last_page": 1,
        "links": [
            {
                "url": null,
                "label": "&laquo; Previous",
                "active": false
            },
            {
                "url": "https://app.honorlock.com/api/en/v1/courses?page=1",
                "label": "1",
                "active": true
            },
            {
                "url": null,
                "label": "Next &raquo;",
                "active": false
            }
        ],
        "path": "https://app.honorlock.com/api/en/v1/courses",
        "per_page": 100,
        "to": 1,
        "total": 1
    }
}
```

Show the list of courses to the user and have the user select a course. Submit that selection back to our application and store the selected courseId somewhere. The URL is a good place to store it, so we can redirect to something like this:

/courses/{courseId}

Note that since our application is stateless, we would have lost that accessToken, so make sure to send it to the client so we can pass it back when we post the user selection.

Next, we want to make a request to get the list of users:

```curl
curl --location 'https://app.honorlock.com/api/en/v1/users' \
--header 'Authorization: Bearer {accessToken}'
```

The response to that will look like this:

```json
{
    "data": [
        {
            "uuid": "27f1e9a1-d2d4-4ca9-afed-75770c367121",
            "first_name": "Johnny",
            "last_name": "Oshika",
            "email": "johnny@examind.io",
            "active": true,
            "timezone": "US/Eastern",
            "roles": [
                "Organization Token Management",
                "School Administrator*"
            ],
            "external_id": null,
            "created_at": "2024-07-03T22:24:30.000000Z",
            "updated_at": "2025-04-08T15:57:20.000000Z"
        },
        {
            "uuid": "c552e20a-957d-42fb-affa-c3319ead1e5c",
            "first_name": "Johnny",
            "last_name": "Instructor",
            "email": "johnny+lti2@examind.io",
            "active": true,
            "timezone": "US/Eastern",
            "roles": [
                "Instructor*"
            ],
            "external_id": null,
            "created_at": "2025-04-08T17:57:37.000000Z",
            "updated_at": "2025-04-08T17:57:37.000000Z"
        }
    ],
    "links": {
        "first": "https://app.honorlock.com/api/en/v1/users?page=1",
        "last": "https://app.honorlock.com/api/en/v1/users?page=1",
        "prev": null,
        "next": null
    },
    "meta": {
        "current_page": 1,
        "from": 1,
        "last_page": 1,
        "links": [
            {
                "url": null,
                "label": "&laquo; Previous",
                "active": false
            },
            {
                "url": "https://app.honorlock.com/api/en/v1/users?page=1",
                "label": "1",
                "active": true
            },
            {
                "url": null,
                "label": "Next &raquo;",
                "active": false
            }
        ],
        "path": "https://app.honorlock.com/api/en/v1/users",
        "per_page": 100,
        "to": 2,
        "total": 2
    }
}
```

Show the list of users and have the user select a user. Submit that selection back to our application and store the selected userId somewhere. The URL is a good place to store it, so we can redirect to something like this:

courses/{courseId}/users/{userId}

With that userId, we can make the next request:

```curl
curl --location 'https://app.honorlock.com/api/en/v1/user-tokens' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer {accessToken}' \
--data '{
    "user_uuid": "{userId}"
}'
```

The response to that will look like this:

```json
{
    "data": {
        "access_token": "{redacted}",
        "expires_at": "2025-04-08T19:55:00.000000Z"
    }
}
```

We want to extract the user access_token from there, whick we will use to generate the HTML that we render to the client, which is this:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <script type="module" src="https://unpkg.com/@honorlock/elements"></script>

    <honorlock-elements></honorlock-elements>

    <script>
    document.addEventListener('HonorlockElements', () => {
        console.log("HonorlockElements", HonorlockElements)
        window.HonorlockElements.init({
            // User instructor access token from POST https://app.honorlock.com/api/en/v1/user-tokens
            // using user_uuid of a user with role Instructor*
            // IMPORTANT: This token is only valid once. Once used, it's burnt.
            // Also, make sure to unblock 3rd party cookies in order for this to work.
            token: '{userAccessToken}',
            debug: true,
            context: {
                type: 'course',
                id: '{courseId}',
            },
        });
    });
    </script>
</body>
</html>
```

That it!