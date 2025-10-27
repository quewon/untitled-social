# [untitled social](https://quewon.github.io/projects/untitled%20social/)

*untitled social* is a barebones alternative social media designed for small-scale use. it's built on Node.js and Express, using ejs for templating, SQLite for the database, and Backblaze B2 for media hosting.

what *untitled social* has:
- one global feed that people can post on
- a modular post builder that can contain markdown-formatted text, images, video, and audio
- progressive web app (PWA) functionality with responsive ui
- a push notification system

what it doesn't have:
- a user system (posters can attach a "name" to a post, but posts are made essentially anonymously)
- limited curation (no tags, no followers, no site search, etc. posts can be filtered by "name")
- likes/votes
- deleting or editing posts

these choices were made intentionally to limit the scope of *untitled social*. but feel free to build on it or modify it to your liking, and feel free to leave an issue on github if you have any questions about it.

you can host *untitled social* on any server but the configuration for the DigitalOcean droplet (VPS) i'm using is: 512 MB memory / 10 GB disk / Ubuntu 24.04 (LTS) x64. i'm currently using Apache (v2.4.58) to serve it and FreeDNS for a free domain :) along with B2's generous free tier this setup runs me less than $5 a month, though do keep in mind this is at a low usage rate.