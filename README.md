# Love and Sharing Website  

Creative sandbox for the Love & Sharing AI project.  
Built locally in VS Code and later hosted free on GitHub Pages or Netlify.

## Local admin API

An optional helper server powers the in-site admin panel for staging new storybook pages.

```powershell
python -m pip install -r requirements.txt
python admin_server.py
```

By default the server listens on `http://127.0.0.1:5001`. Set `LS_ADMIN_TOKEN` to enforce
an admin token, and use `ADMIN_SERVER_HOST`, `ADMIN_SERVER_PORT`, or `ADMIN_SERVER_DEBUG`
to adjust the runtime behaviour.
