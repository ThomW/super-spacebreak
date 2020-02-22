# SUPER SPACEBREAK
Ever wonder why there was a spaceman on the cover of the Atari 2600 game Super Breakout?  Me too.

![screenshot](https://github.com/ThomW/ufo-destruction/blob/master/screenshots/title.png?raw=true)

[Play the game](https://lmnopc.com/super-spacebreak/)

# Why I Made This

I love the artwork Atari's artists would crank out for the box art of their 2600 games, but it's obviously in contrast to the ridiculously simple presentation of the actual games. My objective with this is to make a game that more accurately represents the image pictured on the front of the box by incorporating either a similar art style, or including elements on the box that don't make an appearance in the game at all.  

I chose [Super Breakout](http://www.atarimania.com/game-atari-2600-vcs-super-breakout_7848.html). It's a super simple game, but the box art includes an astronaut that doesn't make an appearance in the game whatsoever. I'm trying to correct that. I hope you find my take as dumb and funny as I do.

# Making the Sausage

This was supposed to be a quick weekend project, but things quickly blossomed out of scope when the astronaut rag doll turned out to be more difficult to create than I thought. Phaser.io now supports [Matter.js](https://brm.io/matter-js/) out of the box, so I went with that instead of turning to Box2d as I did with [Air Sea Golf](http://www.lmnopc.com/air-sea-golf/).

Since I was planning on this being a throwaway, I leaned heavily on the code I had written for [UFO Destruction](http://lmnopc.com/ufo/) to get the basic game working, but that didn't do a bunch of things -- you have to refresh to restart the game, it doesn't tell you to turn your phone sideways - all the little things you'd add if you had enough time, but didn't with that project.  ANother huge timesink was the change to Matter.js;  the game code [straight up broke](http://lmnopc.com/games/super-spacebreak/index.html) after the switch. I wound up writing all the physics code for the brick-breaker game myself, but I later learned that you can mix and match physics engines in Phaser, so that wound up being a huge waste of time.

Programs used: 

* CorelDraw 9
* [Paint.net](https://www.getpaint.net/)
* [Procreate](https://apps.apple.com/us/app/procreate/id425073498)
* [sfxr](https://github.com/grimfang4/sfxr)
* [Visual Studio Code](https://code.visualstudio.com/)
* [Reason 10](https://www.reasonstudios.com/en/reason/new)
* [Bitmap Font Generator](https://www.angelcode.com/products/bmfont/)

# Credits

* I used fonts from [AtariAge.com](https://atariage.com/2600/archives/AtariFonts/index.html?SystemID=2600) for my fake box art and some of the in-game text.
