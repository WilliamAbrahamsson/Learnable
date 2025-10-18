

### API Reverse Engineering

https://www.studocu.com/api/studylists/4345028/related


## Example Response
```json
{
  "data": [
    {
      "id": 8906220,
      "name": "kiin",
      "url": "https://www.studocu.com/sv/studylist/kiin/8906220",
      "updatedAt": 1760102845,
      "documentCount": 7,
      "studentCount": 0,
      "user": {
        "id": 45379379,
        "name": "Fardowsa Hassan"
      }
    },
    {
      "id": 8978417,
      "name": "Organisation och ledarskap - 2025-10-03",
      "url": "https://www.studocu.com/sv/studylist/organisation-och-ledarskap-2025-10-03/8978417",
      "updatedAt": 1759492241,
      "documentCount": 12,
      "studentCount": 0,
      "user": {
        "id": 59588974,
        "name": "Isabelle Andersson"
      }
    },
    {
      "id": 8991975,
      "name": "Organisation och ledarskap - 2025-10-03",
      "url": "https://www.studocu.com/sv/studylist/organisation-och-ledarskap-2025-10-03/8991975",
      "updatedAt": 1759393750,
      "documentCount": 5,
      "studentCount": 0,
      "user": {
        "id": 57809998,
        "name": "Hugo Löfgren"
      }
    }
  ]
}
```



https://www.studocu.com/rest-api/v1/guests/ratings?documentIds=115181523

```json
{
  "error": {
    "key": "INVALID_FIELDS",
    "errors": {
      "x-request-id": [
        {
          "key": "REQUIRED",
          "attribute": "x-request-id"
        }
      ],
      "x-session-id": [
        {
          "key": "REQUIRED",
          "attribute": "x-session-id"
        }
      ]
    }
  }
}
```

https://www.studocu.com/rest-api/v1/courses/4345028/documents?limit=7&sortBy=rating
```
{
  "data": [
    {
      "course": {
        "id": 4345028,
        "links": {
          "self": "/courses/4345028"
        }
      },
      "document": {
        "id": 17794917,
        "links": {
          "self": "/documents/17794917"
        }
      }
    },
    {
      "course": {
        "id": 4345028,
        "links": {
          "self": "/courses/4345028"
        }
      },
      "document": {
        "id": 20591102,
        "links": {
          "self": "/documents/20591102"
        }
      }
    },
    {
      "course": {
        "id": 4345028,
        "links": {
          "self": "/courses/4345028"
        }

        ```


https://www.studocu.com/rest-api/v1/users/47046517

```
{
  "data": {
    "id": 47046517,
    "firstName": "Amer",
    "lastName": "khalil",
    "pictureUrl": null,
    "isPremium": false,
    "studyYear": 2024,
    "study": null,
    "institution": {
      "id": 8992,
      "type": "UNIVERSITY",
      "links": {
        "self": "/universities/8992"
      }
    },
    "grade": null,
    "degree": null
  }
}
```


https://www.studocu.com/rest-api/v1/users/47046517/profile

```
{
  "data": {
    "upvoteCount": 2,
    "downloadImpactScore": 18,
    "uploads": {
      "count": 3,
      "links": {
        "self": "/users/47046517/uploads"
      }
    },
    "followingCourses": {
      "count": 0,
      "links": {
        "self": "/users/47046517/courses/following"
      }
    },
    "followingBooks": {
      "count": 0,
      "links": {
        "self": "/users/47046517/books/following"
      }
    },
    "followingStudylists": {
      "count": 1,
      "links": {
        "self": "/users/47046517/studylists/following"
      }
    },
    "followingUsers": {
      "count": 0,
      "links": {
        "self": "/users/47046517/users/following"
      }
    },
    "followers": {
      "count": 0,
      "links": {
        "self": "/users/47046517/followers"
      }
    }
  }
}
```


https://www.studocu.com/rest-api/v1/bff/document-cards/68056351

```
{
  "data": {
    "id": 68056351,
    "title": "Föreläsning 2 olle duhlin strukturperspektivet",
    "rating": {
      "total": 14,
      "positive": 14,
      "negative": 0,
      "positiveExperienceProbability": 0.938
    },
    "category": {
      "id": 3
    },
    "isPremium": true,
    "numberOfPages": 5,
    "file": {
      "objectKey": "7e656562e54c9fd672de5fc438b07f6d"
    },
    "course": {
      "id": 4345028,
      "name": "Organisation och ledarskap",
      "code": "1FE190",
      "regionCode": "sv",
      "grade": null,
      "degree": null
    },
    "institution": {
      "id": 8992,
      "name": "Linnéuniversitetet",
      "type": "UNIVERSITY"
    },
    "createdAt": "2023-08-31T10:30:55+02:00",
    "slug": "forelasning-2-olle-duhlin-strukturperspektivet",
    "additionalDetails": {
      "academicYear": "2023/2024"
    },
    "thumbnails": [
      {
        "width": 115,
        "height": 163,
        "format": "png",
        "url": "https://website-assets.studocu.com/img/document_thumbnails/7e656562e54c9fd672de5fc438b07f6d/thumb_115_163.png"
      },
      {
        "width": 115,
        "height": 163,
        "format": "webp",
        "url": "https://website-assets.studocu.com/img/document_thumbnails/7e656562e54c9fd672de5fc438b07f6d/thumb_115_163.webp"
      },
      {
        "width": 300,
        "height": 425,
        "format": "png",
        "url": "https://website-assets.studocu.com/img/document_thumbnails/7e656562e54c9fd672de5fc438b07f6d/thumb_300_425.png"
      },
      {
        "width": 300,
        "height": 425,
        "format": "webp",
        "url": "https://website-assets.studocu.com/img/document_thumbnails/7e656562e54c9fd672de5fc438b07f6d/thumb_300_425.webp"
      },
      {
        "width": 1200,
        "height": 1698,
        "format": "png",
        "url": "https://website-assets.studocu.com/img/document_thumbnails/7e656562e54c9fd672de5fc438b07f6d/thumb_1200_1698.png"
      },
      {
        "width": 1200,
        "height": 1698,
        "format": "webp",
        "url": "https://website-assets.studocu.com/img/document_thumbnails/7e656562e54c9fd672de5fc438b07f6d/thumb_1200_1698.webp"
      }
    ]
  }
}
```

