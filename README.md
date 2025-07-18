# [untitled social](https://quewon.github.io/projects/2024-untitled-social/)

untitled social is a small alternative social media that I made for and with a local group of friends in Seoul. We were starting to hang out pretty consistently. We all shared an exhaustion with modern social media, and we had our own various reasons for it. The performativity of an appearance-centric social media culture, the obligation to share things and keep up with it, the toxic algorithms that prioritized engagement over all.

At the same time all of us had an intimate relationship with the internet and had experienced the way it could be genuinely informative, stoking our curiosity, culturally fulfilling, and sincerely social.

So at the time I was drifting away from social media, but didn't cut it out of my life entirely. I didn't post but I still used it to see what my friends were up to and communicate with them. The only place I consistently posted anything was [Cohost](https://en.wikipedia.org/wiki/Cohost), and I really liked what it did for me as a slow social media with no complex feed algorithm based on collected user data, and no numbers. It felt like old internet forums I frequented: communal, cozy.

untitled social is hosted on the cheapest DigitalOcean droplet I could find. Its domain is a subdomain of a Free DNS domain. Multimedia is stored and hosted through Backblaze B2, which has a daily free usage allowance, and so for the scope of the website basically costs nothing. All in all running the website costs me around 7,000 KRW (~$5) a month.

It's built on Node.js using ejs views. There is no user system. Users make posts essentially anonymously, but have the ability to sign and index the post with their name. All posts are made on a single global feed. Posts can contain text, of course, as well as images, videos, audio (which you can record in-app) and doodles (images that you can draw in-app). It has PWA functionality with notifications, so it can easily be used as a mobile app.

[Here](https://quewon.github.io/text/2024-11-19-untitled-social.html) is a link to a copy of one of the first posts I made on untitled social, writing in length about what I wanted it to be.

As of May 2025 it has been about 6 months since I shared the link with my friends, and untitled social has settled as a place to post noncommittally, among known and close friends, random thoughts or news or seeking advice. 871 posts have been made between 6 people. There were 348 posts made in November which has dropped down to 22 posts made in April. Some friends use it more frequently than others. Some write longer posts. For me, it continues to fill a gap that I feel in the internet.
