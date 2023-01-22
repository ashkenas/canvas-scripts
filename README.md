# Canvas REST API Wrapper
Spoiler alert, it only wraps the single call I need to make grading students happen at a reasonable speed.

# Example Usage

```js
const updater = await new BulkGradeUpdater()
    .setParameters(apiKey, courseId, assignmentId);
updater.addStudent(1001, 97, "-3, no name.");
updater.addStudent(1002, 100, "Full marks.");
await updater.sendUpdate();
```

## Dependencies
 - node-fetch (can be easily converted to another http module)