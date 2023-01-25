# Canvas REST API Wrapper
Spoiler alert, it only wraps the single call I need to make grading students happen at a reasonable speed.

## Example Usage

```js
const updater = await new BulkGradeUpdater()
    .setParameters(apiKey, courseId, assignmentId);
updater.addStudent(1001, 97, "-3, no name.");
updater.addStudent(1002, 100, "Full marks.");
await updater.sendUpdate();
```

## API Key???
How to obtain an API key for your Canvas account:
1. Click on your profile on the side bar, and then select `Settings`
2. Scroll down to `Approved Integrations`
3. Click `+ New Access Token`
4. Fill in the fields with your desired values and click `Generate Token`
5. Congratulations! You can now auto-grade.

## Dependencies
 - `node-fetch` (can be easily converted to another http request module)