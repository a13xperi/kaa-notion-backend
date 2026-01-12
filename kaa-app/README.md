# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Development workflow (monorepo)

Start both services
```bash
npm run dev
```
- web: React (CRA) on http://localhost:3000
- api: runs ../server with hot-reload (HTTP :3001, WebSocket :3002)

Stop both services
```bash
npm run stop
```
This also frees ports 3000/3001/3002 if they’re occupied.

Dependency changes
- Stop dev servers before running installs to avoid transient rebuild errors while node_modules updates.

Avoid backgrounded dev commands
- Do not append `&` to dev commands; it leaves jobs suspended (tty input). Use terminal splits or this orchestrated script.
- If you must detach:
```bash
nohup npm run dev:api </dev/null >/tmp/api.log 2>&1 & disown
nohup npm run dev:web </dev/null >/tmp/web.log 2>&1 & disown
```

Port cleanup
```bash
lsof -ti tcp:3000,3001,3002 | xargs kill -TERM
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
