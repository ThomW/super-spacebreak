var Breakout = new Phaser.Class({

    Extends: Phaser.Scene,

    initialize: function Breakout ()
    {
        Phaser.Scene.call(this, { key: 'breakout' });

        this.GS_GAME_OVER = "GAME OVER";
        this.GS_GAME_ACTIVE = "GAME ACTIVE";

        this.gameState = this.GS_GAME_OVER;

        this._score;
        this._remainingBalls = 0;
        this.level;
        this.highestRowHit;

        this.bricks;
        this.paddle;
        this.ball;
        this.stars;
        this.astronaut;
        this.astronautImages = {};

        this.scanlines;
    },

    preload: function ()
    {
        this.load.bitmapFont('8bit', 'fonts/8bit.png', 'fonts/8bit.xml');

        this.load.image('background', 'img/background.png');
        this.load.image('scanlines', 'img/scanlines.png');
        this.load.image('paddle', 'img/paddle.png');

        this.load.image('astro-head', 'img/astro-head.png');
        this.load.image('astro-chest', 'img/astro-chest.png');
        this.load.image('astro-upper-left-arm', 'img/astro-upper-left-arm.png');
        this.load.image('astro-lower-left-arm', 'img/astro-lower-left-arm.png');
        this.load.image('astro-upper-left-leg', 'img/astro-upper-left-leg.png');
        this.load.image('astro-lower-left-leg', 'img/astro-lower-left-leg.png');
        this.load.image('astro-upper-right-arm', 'img/astro-upper-right-arm.png');
        this.load.image('astro-lower-right-arm', 'img/astro-lower-right-arm.png');
        this.load.image('astro-upper-right-leg', 'img/astro-upper-right-leg.png');
        this.load.image('astro-lower-right-leg', 'img/astro-lower-right-leg.png');

        this.load.image('brick-glow', 'img/brick-glow.png');

        for (var i = 0; i < 5; i++) {
            this.load.image('brick' + i, 'img/brick-' + i + '.png');

            this.load.audio('brick_hit_' + i, [
                'audio/hit-row' + i + '.ogg',
                'audio/hit-row' + i + '.mp3'
            ]);
        }

        this.load.audio('paddle_hit', [
            'audio/hit-paddle.ogg',
            'audio/hit-paddle.mp3'
        ]);

        this.load.image('ball', 'img/ball.png');
        this.load.atlas('explosion', 'img/explosion.png', 'img/explosion.json');

        this.load.image('title', 'img/title.png');

        // Load shaders
        this.crtPipeline = this.game.renderer.addPipeline('crtgeom', new CrtGeomPipeline(this.game));
    },

    create: function ()
    {
        // Shader setup
        var cam = this.cameras.main;
        cam.setRenderToTexture(this.crtPipeline);
        cam.setPipeline('crtgeom');

        this.ballDefaultVelocity = 5;

        this.soundBrickHit = [];
        for (var i = 0; i < 5; i++) {
            this.soundBrickHit[i] = this.sound.add('brick_hit_' + i);
        }
        this.soundPaddleHit = this.sound.add('paddle_hit');

        this.add.image(400, 300, 'background');

        // Add stars to the game
        this.stars = [];
        for (var i = 0; i < 40; i++)
        {
            var starX = this.rnd(-400, 400);
            var starY = this.rnd(-300, 300);

            var angleRad = Math.atan(Math.abs(starY) / Math.abs(starX));
            var velocity = this.rnd(5, 60) / 100.0;

            var xVel = Math.cos(angleRad) * velocity;
            var yVel = Math.sin(angleRad) * velocity;

            if (starX < 0) { xVel *= -1; }
            if (starY < 0) { yVel *= -1; }

            // Create star centered relative to the center of the screen
            var star = this.add.circle(starX + 400.0, starY + 400.0, this.rnd(1,3), 0xffffffff);
            
            this.setVelocity(star, 'x', xVel);
            this.setVelocity(star, 'y', yVel);

            this.stars.push(star);
        }

        this.bricks = [];

        this.ball = this.matter.add.image(400, 480, 'ball').setStatic(true);
        this.setVelocity(this.ball, 'x', 0.0);
        this.setVelocity(this.ball, 'y', 0.0);

        this.stopBall();
        this.ball.setData('onPaddle', true);

        this.paddle = this.add.image(400, 500, 'paddle');

        // Instantiate our astronaut
        this.astronaut = new ragdoll(400, 600, 0.7);
        this.matter.world.add(this.astronaut);

        for (var i = 0; i < this.astronaut.bodies.length; i++) {
           
            body = this.astronaut.bodies[i];
            
            // Attach the astronaut's hand to the ball and set constraints
            if (body.label == 'left-hand') {
                this.matter.add.constraint(this.ball, body, 0.1, 1);
                break;
            }

            // Load in pieces to make up the astronaut
            var am = this.matter.add.image(0, 0, 'astro-' + body.label);
            am.body = body;

            this.astronautImages[body.label] = am;            
        }

        // Tie the astronaut bodies to their related images
        for (var i = 0; i < this.astronaut.bodies.length; i++) {
            if (this.astronaut.bodies[i].key in this.astronautImages) {
                this.astronautImages[body.label].body = this.astronaut.bodies[i];
            }
        }

        // There's no x gravity and gravity in the positive Y direction
        this.matter.world.setGravity(0, 0, 0);

        //  Input events
        this.input.on('pointermove', function (pointer) {

            //  Keep the paddle within the game
            this.paddle.x = Phaser.Math.Clamp(pointer.x, 65, 735);

            if (this.ball.getData('onPaddle'))
            {
                this.ball.x = this.paddle.x;
            }

        }, this);

        this.input.on('pointerup', function (pointer) {

            // If the game's over, restart the game
            if (this.gameState == this.GS_GAME_OVER) {
                this.startGame();
            } 
            // If the game is active and the ball's on the paddle, release the ball
            else if (this.gameState == this.GS_GAME_ACTIVE) {

                if (this.ball.getData('onPaddle')) {
                    this.ball.setData('onPaddle', false);
                    this.startLevel();
                }
            }

        }, this);
        
        this.scoreText = this.add.bitmapText(10, 560, '8bit', '', 32).setOrigin(0).setLeftAlign();
        this.setScore(0);

        this.ballsText = this.add.bitmapText(800, 560, '8bit', '', 32).setOrigin(1, 0).setRightAlign();
        this.setRemainingBalls(0);

        this.centeredText = this.add.bitmapText(400, 300, '8bit', 'default text', 32).setOrigin(0.5).setCenterAlign();
        this.centeredText.setText(['Click to begin']);

        this.scanlines = this.add.image(400, 300, 'scanlines');

        this.title = this.add.image(400, 300, 'title');
    },

    hitBrick: function (brick)
    {
        // Figure out what part of the ball overlaps with the brick to bounce correctly
        var ballBounds = this.ball.getBounds();
        var brickBounds = brick.getBounds();

        
        var hit = false;

        // Hit somewhere on left side of the brick, meaning x should go negative
        if (Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.right, ballBounds.centerY))
        {
            this.setVelocity(this.ball, 'x', Math.abs(this.getVelocity(this.ball, 'x')) * -1);
            hit = true;
        }
        // Right side of the brick
        else if (Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.left, ballBounds.centerY))
        {
            this.setVelocity(this.ball, 'x', Math.abs(this.getVelocity(this.ball, 'x')));
            hit = true;
        }

        // Hit the top side of the brick - Y should go negative
        if (Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.centerX, ballBounds.bottom))
        {
            this.setVelocity(this.ball, 'y', Math.abs(this.getVelocity(this.ball, 'y')) * -1);   
            hit = true;
        }

        // Hit bottom - ball should go positive
        if (Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.centerX, ballBounds.top))
        {
            this.setVelocity(this.ball, 'y', Math.abs(this.getVelocity(this.ball, 'y')));
            hit = true;
        }

        if (hit) {

            // This is the row number for the brick that was just hit
            var brickRow = brick.getData('row');

            // Play the appropriate sound
            this.soundBrickHit[brickRow].play();

            // Calculate new velocity for the ball - it gets faster as it hits further up the wall
            if (this.highestRowHit < brickRow)
            {
                this.highestRowHit = brickRow;
                this.calculateNewBallVelocity();
            }

            // Make the brick flash white and fade when it's destroyed
            var glow = this.add.image(brick.x, brick.y, 'brick-glow');
            var tween = this.tweens.add({
                targets: glow,
                alpha: 0,
                delay: 125,
                duration: 250,
                repeat: 0,
                onComplete: function() { glow.destroy(); }
            });

            // Destroy and remove the brick from the collection
            brick.destroy();
            this.bricks = this.arrayRemove(this.bricks, brick);

            this.increaseScore(1);

            if (this.bricks.length === 0)
            {
                this.levelUp();
            }
        }
    },

    resetBall: function ()
    {
        if (this.getRemainingBalls() > 0) {

            this.decrementRemainingBalls();

            this.stopBall();

            this.ball.setPosition(this.paddle.x, 478);
            this.ball.setData('onPaddle', true);

            // Reset the highest row hit to the bottom row
            this.highestRowHit = 0;
        }
    },

    startGame: function()
    {
        console.log('welcome to startGame');

        // Reset variables at the start of the game
        this.level = 1;
        this.setScore(0);
        
        this.setRemainingBalls(3);

        this.resetBall();
        
        this.highestRowHit = 0;
        this.gameState = this.GS_GAME_ACTIVE;

        // Hide the title screen and centered text
        this.title.visible = false;
        this.centeredText.visible = false;

        // Build the bricks
        this.resetBricks();
    },

    // This basically returns the current value we're using for the hypotenuse of our angles.
    // It's calculated based on the default velocity at the beginning of the game, scaled up 
    // based on the level the player is on, and the highest row of blocks hit on this level.
    getCurrentVelocity: function()
    {
        var ret = this.ballDefaultVelocity + ((this.level - 1) * 1) + (this.highestRowHit * 0.5);
        console.log('Velocity: ' + ret);
        return ret;
    },

    calculateNewBallVelocity: function(angle)
    {
        var origX = this.getVelocity(this.ball, 'x');
        var origY = this.getVelocity(this.ball, 'y');

        // Calculate the angle based on the current x+yVel
        var angleRad = Math.atan(Math.abs(this.getVelocity(this.ball, 'y')) / Math.abs(this.getVelocity(this.ball, 'x')));

        // Calculate new velocity
        var xVel = Math.cos(angleRad) * this.getCurrentVelocity();
        var yVel = Math.sin(angleRad) * this.getCurrentVelocity();

        if (origX < 0) { xVel *= -1; }
        if (origY < 0) { yVel *= -1; }

        this.setVelocity(this.ball, 'x', xVel);
        this.setVelocity(this.ball, 'y', yVel);
    },

    startLevel: function()
    {
        this.ball.setData('onPaddle', false);

        // Calcuate angle -- remembering that straight up is 90deg
        var angle = this.rnd(110, 130);

        // Convert angle to radians
        angle = angle * 0.01745329252;

        // Calculate velocities
        var xVel = Math.cos(angle) * this.getCurrentVelocity();
        var yVel = Math.sin(angle) * this.getCurrentVelocity();

        // Store velocities
        this.setVelocity(this.ball, 'x', xVel);
        this.setVelocity(this.ball, 'y', yVel);
    },

    levelUp: function ()
    {
        this.level += 1;

        this.highestRowHit = 0;

        this.resetBricks();

        this.stopBall();
        this.ball.setPosition(this.paddle.x, this.paddle.y - 20);
        this.ball.setData('onPaddle', true);
    },

    hitPaddle: function (ball, paddle)
    {
        // This is the max angle of deflection
        var maxAngle = 50.0;

        // Calcuate where on the paddle the ball hit in a number from -1.0 to 1.0 representing percent
        var diff = ball.x - paddle.x;
        var pct = diff / (paddle.width * 0.5);

        // Deal with a positive angle - we'll flip at the end if necessary
        pct = Math.abs(pct);

        // Make sure pct doesn't go higher than 100%
        pct = Math.min(1, pct);

        // Calcuate angle -- remembering that straight up is 90deg
        var angle = (maxAngle * pct) + 90.0;

        // Convert angle to radians
        angle = angle * 0.01745329252;

        // Calculate velocities
        var xVel = Math.cos(angle) * this.getCurrentVelocity();
        var yVel = Math.sin(angle) * this.getCurrentVelocity();

        // Flip the xVel if the ball is on the left side of the paddle
        if (ball.x > paddle.x) {
            xVel *= -1;
        }

        // Make sure yVel points up!
        yVel = Math.abs(yVel) * -1;

        // Set velocities
        this.setVelocity(this.ball, 'x', xVel);
        this.setVelocity(this.ball, 'y', yVel);

        this.soundPaddleHit.play();
    },

    update: function (time, delta)
    {
        this.centeredText.visible = true;
        this.centeredText.setText(['delta: ' + delta.toFixed(2)]);

        for (var i = 0; i < this.stars.length; i++)
        {
            var star = this.stars[i];
            var xv = this.getVelocity(star, 'x');
            var yv = this.getVelocity(star, 'y');
            star.x += xv;
            star.y += yv;

            if (star.x < 0 || star.x > 800 || star.y < 0 || star.y > 600) {
                star.x = 400;
                star.y = 300;
            }
        }

        this.ball.x += this.getVelocity(this.ball, 'x');
        this.ball.y += this.getVelocity(this.ball, 'y');

        // Let the ball go way out of bounds before resetting
        if (this.ball.y > 800)
        {
            if (this.getRemainingBalls() > 0) {
                this.resetBall();
            } else {
                this.endGame();
            }
        }
        else if (this.ball.y < 15)
        {
            this.bounceBallY();
            this.soundPaddleHit.play();
        }

        var minX = 15;
        var maxX = 800 - 15;
        if (this.ball.x > maxX)
        {
            this.ball.x = maxX;
            this.bounceBallX();
            this.soundPaddleHit.play();
        } 
        else if (this.ball.x < minX)
        {
            this.ball.x = minX;
            this.bounceBallX();
            this.soundPaddleHit.play();
        }

        // See if the ball is hitting the paddle
        if (this.checkOverlap(this.paddle, this.ball))
        {
            this.hitPaddle(this.ball, this.paddle);
        }

        // See if the ball is hitting any of the bricks
        var brick = null;
        for (var i = 0; i < this.bricks.length; i++)
        {
            if (this.checkOverlap(this.bricks[i], this.ball))
            {
                brick = this.bricks[i];
                break;
            }
        }

        if (brick != null)
        {
            this.hitBrick(brick);
        }

        /*
        // This moves the bricks down the screen for a weird challenge -- doesn't really work unless I add more bricks at the top of the screen once they get past a certain point.  
        var brickSpeed = 0.05;
        var lowestBrickY = 100000;
        for (var i = 0; i < this.bricks.length; i++)
        {
            this.bricks[i].y += brickSpeed;
            lowestBrickY = Math.min(this.bricks[i].y, lowestBrickY);
        }
        */

    },

    resetBricks : function() 
    {
        // Clear out all of the brick objects
        while (this.bricks.length)
        {
            this.bricks[0].destroy();
            this.bricks.shift();
        }

        var colors = [0xD62226, 0xF5C603, 0x01AA31, 0x1FC3CD, 0x4542B9, 0x411271];

        // Setup
        for (var i = 0; i < 5; i++)
        {
            var rowColor = colors[i % colors.length];

            for (var j = 0; j < 13; j++)
            {
                var brickIdx = 'brick' + (i % 5);
                
                // var brick = this.bricks.create(57 + j * 57, 150 + i * 25, brickIdx);
                var brick = this.add.sprite(57 + j * 57, 150 + i * 25, brickIdx);

                brick.visible = true;
                brick.setData('row', 4 - i); // Flip the sounds

                this.bricks.push(brick);
            }
        }

        // Fix the depth sorting
        this.ball.setDepth(1);
        this.scanlines.setDepth(1);
        this.title.setDepth(1);
    },

    // Returns an integer random number within our min/max range
    rnd: function(min,max) {
        return Math.round(Math.random() * (max - min) + min);
    },

    endGame: function() {

        this.gameState = this.GS_GAME_OVER;

        this.centeredText.setText(['GAME OVER', '', 'CLICK TO START OVER']);
        this.centeredText.visible = true;

        this.stopBall();
    },
    // ATTN: This doesn't modify the array - it returns that
    arrayRemove: function(arr, value) {
       return arr.filter(function(ele){
           return ele != value;
       });
    },
    stopBall: function() {
        this.setVelocity(this.ball, 'x', 0);
        this.setVelocity(this.ball, 'y', 0);
    },
    bounceBall: function() {
        this.bounceBallX();
        this.bounceBallY();
    },
    bounceBallX: function() {
        this.setVelocity(this.ball, 'x', this.getVelocity(this.ball, 'x') * -1);
    },
    bounceBallY: function() {
        this.setVelocity(this.ball, 'y', this.getVelocity(this.ball, 'y') * -1);
    },
    checkOverlap: function(spriteA, spriteB) {
        if (typeof spriteA == 'undefined' || typeof spriteB == 'undefined') 
        {
            return false;
        }
        var boundsA = spriteA.getBounds();
        var boundsB = spriteB.getBounds();

        return Phaser.Geom.Rectangle.Overlaps(boundsA, boundsB);
    },
    setVelocity: function(obj, axis, value) {
        obj.setData(axis + 'v', value);
    },
    getVelocity: function(obj, axis) {
        return obj.getData(axis + 'v');
    },
    getRemainingBalls: function() {
        return this._remainingBalls;
    },
    setRemainingBalls: function(balls) {
        this._remainingBalls = balls;
        this.ballsText.setText('SHOTS: ' + this._remainingBalls);
    },
    decrementRemainingBalls: function() {
        this.setRemainingBalls(this._remainingBalls - 1);
    },
    getScore: function() {
        return this._score;
    },
    setScore: function(score) {
        this._score = score;
        this.scoreText.setText('SCORE: ' + score);
    },
    increaseScore: function(amt) {
        this.setScore(this._score + amt);
    }

});

var config = {
    type: Phaser.WEBGL,
    width: 800,
    height: 600,
    parent: 'gamebox',
    scene: [ Breakout ],
    physics: {
        default: 'matter',
        matter: {
            debug: false
        }
    }
};

var game = new Phaser.Game(config);
