IndexedDB in the Browser
Overview

IndexedDB is the browser's built-in client-side database system. It allows web applications to store large amounts of structured data directly on a user's device and access that data efficiently, even when the application is offline.

Unlike simpler browser storage mechanisms such as localStorage, IndexedDB is designed for complex applications that need:

Large storage capacity
Structured data storage
Fast querying through indexes
Transaction support
Offline functionality
Binary file storage

You can think of IndexedDB as a lightweight NoSQL database that runs entirely inside the browser.

Why IndexedDB Exists

Modern web applications often need capabilities similar to desktop applications.

Examples include:

Gmail Offline
Google Docs
Notion
Trello
Progressive Web Apps (PWAs)

Traditional browser storage solutions have limitations:

Feature	Cookies	localStorage	IndexedDBStorage Capacity	Very Small	Small (~5-10 MB)	Large (Hundreds of MBs+)
Data Type	Strings	Strings	JavaScript Objects
Query Support	No	No	Yes
Transactions	No	No	Yes
Binary Data	No	No	Yes
Async API	N/A	No	Yes

IndexedDB addresses these limitations by providing a full-featured database API inside the browser.

Core Concepts
Database

A database is the top-level container that holds object stores and indexes.

const request = indexedDB.open("MyAppDB", 1);


In this example:

Database Name: MyAppDB
Version: 1
Object Store

An Object Store is conceptually similar to a table in a relational database.

SQL Example
Users
-----
id
name
email

IndexedDB Equivalent
db.createObjectStore("users", {
    keyPath: "id"
});


The object store name is:

users

Records

Records are the individual entries stored inside an object store.

Example:

{
    id: 1,
    name: "John",
    email: "john@example.com"
}


Unlike localStorage, records can be stored as native JavaScript objects without manual serialization.

Keys

Every record requires a unique identifier.

Example:

db.createObjectStore("users", {
    keyPath: "id"
});


Stored record:

{
    id: 100,
    name: "Alice"
}


In this case, 100 becomes the primary key.

Indexes

Indexes improve query performance and allow searching by fields other than the primary key.

Create an Index
store.createIndex(
    "emailIndex",
    "email",
    { unique: true }
);


Without an index, finding a user by email requires scanning every record.

With an index, lookups are optimized.

Database Lifecycle
Opening a Database
const request = indexedDB.open("MyAppDB", 1);


Important events:

request.onerror
request.onsuccess
request.onupgradeneeded

Creating or Upgrading a Database
request.onupgradeneeded = (event) => {
    const db = event.target.result;

    db.createObjectStore("users", {
        keyPath: "id"
    });
};


onupgradeneeded is triggered when:

The database is being created for the first time
The database version changes
Transactions

All IndexedDB operations occur inside transactions.

const tx = db.transaction(
    "users",
    "readwrite"
);


Supported transaction types:

readonly
readwrite


Accessing an object store:

const store = tx.objectStore("users");


Transactions ensure data consistency and integrity.

CRUD Operations
Create (Insert)
store.add({
    id: 1,
    name: "John"
});

Characteristics
Inserts only
Fails if the key already exists
Update
store.put({
    id: 1,
    name: "John Smith"
});

Characteristics
Inserts if record does not exist
Updates if record already exists
add() vs put()
Method	Inserts	Updatesadd()	✅	❌
put()	✅	✅
Read a Single Record
const request = store.get(1);

request.onsuccess = () => {
    console.log(request.result);
};


Result:

{
    id: 1,
    name: "John"
}

Read All Records
const request = store.getAll();

request.onsuccess = () => {
    console.log(request.result);
};

Delete a Record
store.delete(1);

Delete All Records
store.clear();

Querying with Indexes
Create an Index
store.createIndex(
    "email",
    "email",
    { unique: true }
);

Query by Indexed Field
const index = store.index("email");

const request = index.get(
    "john@example.com"
);


This retrieves records using the index instead of scanning every entry.

Working with Cursors

A cursor is an iterator over records in an object store.

Open a Cursor
store.openCursor();

Example
const request = store.openCursor();

request.onsuccess = (event) => {
    const cursor = event.target.result;

    if (cursor) {
        console.log(cursor.value);

        cursor.continue();
    }
};

When to Use Cursors

Cursors are useful for:

Iterating through large datasets
Applying filters
Implementing pagination
Processing records incrementally
Example Application Structure

Suppose you are building a task management application.

Database
TaskApp

Object Stores
tasks
users
settings
attachments

Example Task Record
{
    id: 1,
    title: "Learn IndexedDB",
    completed: false,
    createdAt: 1720000000
}

Asynchronous Nature of IndexedDB

IndexedDB uses an asynchronous API to avoid blocking the browser's UI thread.

Traditional usage:

request.onsuccess = () => {
    console.log(request.result);
};

Promise Wrapper Example

Many developers wrap IndexedDB operations with Promises.

function getUser(id) {
    return new Promise(
        (resolve, reject) => {
            const request = store.get(id);

            request.onsuccess = () =>
                resolve(request.result);

            request.onerror = () =>
                reject(request.error);
        }
    );
}


This enables modern async/await patterns.

Popular IndexedDB Libraries

The native API is powerful but verbose. Most production applications use a wrapper library.

Dexie.js

One of the most popular IndexedDB libraries.

Database Definition
const db = new Dexie("MyDB");

db.version(1).stores({
    users: "id,name,email"
});

Insert Record
await db.users.add({
    name: "John",
    email: "john@example.com"
});

Benefits
Promise-based API
Simpler transactions
Cleaner querying
Better developer experience
idb (Google)

A lightweight Promise-based wrapper around IndexedDB.

import { openDB } from "idb";


Provides a cleaner API while staying close to native IndexedDB concepts.

Real-World Use Cases
Offline-First Applications

Applications can continue functioning without a network connection.

Server unavailable
        ↓
Read from IndexedDB
        ↓
Continue operating


Examples:

Notion
Gmail Offline
Google Docs
API Response Caching
Fetch API
    ↓
Store response in IndexedDB
    ↓
Reuse cached data


Benefits:

Faster page loads
Reduced API calls
Better user experience
Local Search Engines

Store large datasets such as:

Product catalogs
Documentation
Articles
User-generated content

Queries can then be performed locally without contacting the server.

File and Binary Storage

IndexedDB supports storage of:

Blob
File
ArrayBuffer
Images
Videos

Example:

store.put({
    id: 1,
    image: blob
});

Typical IndexedDB Workflow
User Opens App
        ↓
Open IndexedDB
        ↓
Fetch Data from Server
        ↓
Store Data in IndexedDB
        ↓
Render UI
        ↓
Network Lost?
        ↓
Read from IndexedDB
        ↓
Continue Working Offline

Advantages

✅ Large storage capacity

✅ Stores JavaScript objects directly

✅ Efficient querying via indexes

✅ Offline support

✅ Transaction support

✅ Binary data storage

✅ Supported by modern browsers

✅ Suitable for Progressive Web Apps (PWAs)

Disadvantages

❌ Verbose native API

❌ Database migrations require careful version management

❌ Event-based API can feel outdated

❌ More complex than localStorage

❌ Query capabilities are more limited than traditional SQL databases

IndexedDB vs SQL Databases

A useful mental model for backend developers:

SQL Database	IndexedDB EquivalentDatabase	Database
Table	Object Store
Row	Record
Primary Key	Key Path
Index	Index
Transaction	Transaction

Conceptually:

PostgreSQL / MySQL
          ↓
     Browser
          ↓
     IndexedDB


The main difference is that IndexedDB runs entirely on the user's device and is accessed through JavaScript rather than SQL.

Recommended Modern Stack

For modern web applications, a common approach is:

React / Vue / Angular
          ↓
       Dexie.js
          ↓
      IndexedDB


This combination provides:

Strong offline capabilities
High performance
Modern async APIs
Simpler code maintenance
Key Takeaways
IndexedDB is the browser's native database engine.
It is designed for structured, large-scale client-side storage.
Data is organized into databases, object stores, records, and indexes.
All operations occur within transactions.
It supports offline applications, caching, and binary file storage.
Most production applications use wrappers such as Dexie.js or idb instead of the raw API.
For modern PWAs and offline-first applications, IndexedDB is the standard browser storage solution.