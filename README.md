# pt-app

Workout display site hosted on GitHub Pages.

## Live site

https://jules-pierce.github.io/pt-app/login.html 

## Deployment

The site deploys automatically on every push to `main`. No manual steps needed.

To check deployment status: https://github.com/jules-pierce/pt-app/actions

## Testing
Two accounts, both with password "password".
- julesjpierce+client@gmail.com
- julesjpierce+provider@gmail.com

## Local development

ES modules require an HTTP server — opening files directly in the browser won't work.

Start a local server from the `docs` folder on port 8080:

```
cd /Users/jules/Documents/pt-app/docs && python3 -m http.server 8080
```

Then open `http://localhost:8080/login.html` in your browser.
