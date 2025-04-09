Create a new workflow for the student experience. Let's create a separate express router for this so our code is organized. Let's put this router in the /student URL prefix.

First show a page that lists exams. Use Honorlock's API to get the list of exams. To do this, we first need to get an access token from the token endpoint. This is similar to the default page that we built in index.js.

List of exams:

GET https://app.honorlock.com/api/en/v1/exams

The response will look like this:

```json
{
  "data": [
    {
      "uuid": "string",
      "external_id": "string",
      "name": "string",
      "active": 0,
      "instructor_uuid": "string",
      "instructor": {
        "uuid": "string",
        "first_name": "string",
        "last_name": "string",
        "email": "user@example.com",
        "active": true,
        "timezone": "string",
        "roles": [
          "string"
        ],
        "external_id": "string",
        "created_at": "2019-08-24T14:15:22Z",
        "updated_at": "2019-08-24T14:15:22Z"
      },
      "additional_instructors": [
        {
          "uuid": "string",
          "first_name": "string",
          "last_name": "string",
          "email": "user@example.com",
          "active": true,
          "timezone": "string",
          "roles": [
            "string"
          ],
          "external_id": "string",
          "created_at": "2019-08-24T14:15:22Z",
          "updated_at": "2019-08-24T14:15:22Z"
        }
      ],
      "is_scheduled": 0,
      "exam_start": "2019-08-24T14:15:22Z",
      "exam_end": "2019-08-24T14:15:22Z",
      "num_students": 0,
      "authorization_enabled": "string",
      "authorization_url": "string",
      "created_at": "2019-08-24T14:15:22Z",
      "updated_at": "2019-08-24T14:15:22Z"
    }
  ],
  "links": {
    "first": "string",
    "last": "string",
    "prev": "string",
    "next": "string"
  },
  "meta": {
    "current_page": 0,
    "from": 0,
    "last_page": 0,
    "links": [
      {
        "url": "string",
        "label": "string",
        "active": true
      },
      {
        "url": "string",
        "label": "string",
        "active": true
      },
      {
        "url": "string",
        "label": "string",
        "active": true
      }
    ],
    "path": "string",
    "per_page": 0,
    "to": 0,
    "total": 0
  }
}
```

After user selects an exam, call the Extension Check Honolock endpoint:

GET https://app.honorlock.com/api/en/v1/extension/check

Example API response:

```json
{
  "data": {
    "iframe_src": "https://app.honorlock.com/install/extension?locale=en",
    "extension_id": "easrpoxsvfplyfubtodkzvtjezcsfqrz"
  }
}
```

Render a page that does the following:

1. Load Honolock SDK via CDN

```html
<script type="module"
src="https://unpkg.com/@honorlock/integration-sdk-js?module"></script>
```

2. Load iframe using the iframe_src from the API response.

3. Instantiate an instance of honolock:

```javascript
const honorlock = new Honorlock();
```

3. Call init:

```javascript
try {
  await honorlock.init();
} catch (error) {
  //handle error
}
```

4. Register this callback:

```javascript
honorlock.onExtensionVerified(() => {
  //platform specific code to allow test taker to proceed.
  //e.g: Display a button that was previously hidden
  let continueButton = document.querySelector('[data-hl-extension-init]');
  continueButton.style.display = 'block';
});
```

After the user clicks the button, make an ajax request to the server where we will create a student session using Honorlock's API.

```
POST https://app.honorlock.com/api/en/v1/exams/sessions/create

{
  "exam_taker_id": "string",
  "exam_taker_email": "user@example.com",
  "exam_taker_full_name": "string",
  "exam_taker_first_name": "string",
  "exam_taker_last_name": "string",
  "external_exam_id": "string",
  "exam_taker_attempt_id": "string",
  "exam_taker_name_aliases": [
    "John Doe"
  ],
  "pay_amount": 0,
  "bypass_payment": false
}
```

Example API response:

```json
{
  "data": {
    "alerts": {
      "id": "integer",
      "alertable_type": "string",
      "alertable_id": "integer",
      "message": "string",
      "url": "string",
      "enabled": "integer",
      "is_translated": "boolean",
      "alert_level_id": "integer",
      "alert_template_id": "integer",
      "automated": "integer",
      "timeout": "integer",
      "created_by": "integer",
      "updated_by": "integer",
      "pushed_by": "integer",
      "pushed_at": "string",
      "created_at": "string",
      "updated_at": "string",
      "style": "string",
      "type": "string",
      "translations": {
        "example_translation_array": {
          "id": "integer",
          "alert_id": "integer",
          "locale": "string",
          "source": "string",
          "message": "string",
          "created_at": "string",
          "updated_at": "string"
        }
      },
      "level": null
    },
    "session": {
      "uuid": "string",
      "exam_taker_email": "string",
      "external_exam_id": "string"
    },
    "camera_url": "string",
    "configurations": {
      "translations": {
        "example_string_1": "Example Translated String 1",
        "example_string_2": "Example Translated String 2",
        "example_string_array": {
          "value_1": "Example Translated String Array Value 1",
          "value_2": "Example Translated String Array Value 1"
        }
      },
      "exam_toggles": [
        {
          "id": 0,
          "name": "string",
          "code": "string",
          "short_name": "string",
          "description": "string",
          "type": "string",
          "list": [
            {}
          ],
          "help": "string",
          "display": "string",
          "disabled": "string",
          "t_disabled": "string",
          "value": "string"
        }
      ],
      "shortcut_detection_enabled": true,
      "guidelines": {
        "allowed_messages": [
          "Allowed Feature 1",
          "Allowed Feature 2"
        ],
        "not_allowed_messages": [
          "Not Allowed Feature 1",
          "Not Allowed Feature 2"
        ]
      },
      "whitelisted_urls": [
        "honorlock.com"
      ],
      "additional_instructions": "string",
      "simulated": true
    }
  }
}
```

Now get exam instructions from Honolock API:

GET https://app.honorlock.com/api/en/v1/exams/{external_exam_id}/instructions

Example response:

```json
{
  "data": {
    "launch_screen_url": "https://example.com/extension/9169da16-b1a4-4de2-af30-e3ca244f2f29/43c0a2b0-b45c-4026-9505-7bf5d01c6ffd/launch-proctoring?expires=1672531199&locale=en&signature=75866a2686a8ef112b6f6d17eea3834367952b24a0f277d763a8a3e5c74ad720"
  }
}
```

Render the iframe.

Now on the page, call this. Most of this data is session information that will be returned from the API.

```javascript
honorlock.setupSession({
  session: {
    //these values come from the api when creating the session
    session: {
      uuid: '5bcd03ff-4b7c-49f4-a3bc-a6c843c057cd',
      exam_taker_email: 'johndoe@myplatform.com',
      external_exam_id: '1c11c300-16e5-4e88-9b20-2ef658638a6a'
    },
    camera_url: 'https://app.honorlock.com/camera-url',
    configurations: {
      translations: tranlsations,
      exam_toggles: exam_toggles,
      shortcut_detection_enabled: shortcut_detection_enabled,
      simulated: boolean,
      guidelines: {
        allowed_messages: Array<string>
        not_allowed_messages: Array<string>
      },
      whitelisted_urls: Array<string>,
      additional_instructions: additional_instructions
    }
  },
  app_url: "https://myplatform.com",
  external_exam_id: '1c11c300-16e5-4e88-9b20-2ef658638a6a',
  exam_taker_id: '1c11c300-16e5-4e88-abfe-2ef658638a6a',
  exam_taker_name: 'John Doe',
  exam_taker_attempt_id: '3',
  //Optionally: Add an additional domain or URL that will be proctored during the test taking experience.
  additionally_supported_url: 'https://my-other-platform.com',
});
```

Now make an ajax request to the server to do the following:

Verify exam session authentication:

GET https://app.honorlock.com/api/en/v1/exams/{external_exam_id}/sessions/{exam_taker_id}/{exam_taker_attempt_id}/verify

Example response:

```json
{
  "data": {
    "authenticated": true
  }
}
```

Make sure this callback is registered, as it will be called when session starts:

```javascript
honorlock.onBeginExam(() => {
  //platform specific code to allow test taker to proceed.
  //e.g: Display a button that was previously hidden
  let startButton = document.querySelector('[data-hl-extension-start]');
  startButton.style.display = 'block';
});
```

If authenticated, begin the session using the Honolock API:

```
POST https://app.honorlock.com/api/en/v1/session/start

{
  "external_exam_id": "string",
  "exam_taker_id": "string",
  "exam_taker_attempt_id": "string"
}
```

Example response:

```json
{
  "data": {
    "event_type": "string",
    "exam_taker_name": "string",
    "created_at": "2019-08-24T14:15:22Z"
  }
}
```

State needs to be maintained between page navigation. In order to do this, let's store state in the URL just like we do in index.js.

Before starting, review the instructions and ask me questions that you need answered to remove any ambiguity. Only once the requirements become perfectly clear should you start to write code.