var Breakout = new Phaser.Class({

    Extends: Phaser.Scene,

    initialize: function Breakout ()
    {
        Phaser.Scene.call(this, { key: 'breakout' });

        this.GS_GAME_INIT = "INIT";  // This is the state the first time the game is started
        this.GS_GAME_OVER = "GAME OVER";
        this.GS_GAME_ACTIVE = "GAME ACTIVE";
        this.GS_GAME_INTRO = "INTRO";
        this.GS_ENDGAME = 'ENDGAME';
        this.GS_MAIN_MENU = 'MAIN MENU';
        this.GS_SETTINGS_MENU = 'SETTINGS';
        this.GS_GAMEPAD_CALIBRATION = 'GAMEPAD CALIBRATION';

        this.fadeSpeedMs = 500;

        this._gameState = this.GS_MAIN_MENU;

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

        this.introText;

        this.lastPainSound = -1;

        this.menuItems = [];

        this.soundEnabled = true;
        this.voiceEnabled = true;
        this.gamepadEnabled = false;

        this.gamepad = null;
        this.gamepadAxis = null;
        this.gamepadCalibrationValues = {}; // gamepadAxis: [min, max]

        this.confirmCalibrationButtonHandler = null;

        this.NUM_PAIN_SOUNDS = 7; // This is the number of pain sounds in the project
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

        for (var i = 0; i < this.NUM_PAIN_SOUNDS; i++) {
            this.load.audio('voice-pain-' + i, [
                'audio/voice-pain' + i + '.ogg',
                'audio/voice-pain' + i + '.mp3'
            ]);
        }

        for (var i = 0; i < 3; i++) {
            this.load.audio('voice-ball-' + i, [
                'audio/voice-ball' + i + '.ogg',
                'audio/voice-ball' + i + '.mp3'
            ]);
        }

        this.load.image('endgame', 'img/endgame.png');

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

        this.ballDefaultVelocity = 3;

        this.soundBrickHit = [];
        for (var i = 0; i < 5; i++) {
            this.soundBrickHit[i] = this.sound.add('brick_hit_' + i);
        }
        this.soundPaddleHit = this.sound.add('paddle_hit');

        this.soundPain = [];
        for (var i = 0; i < this.NUM_PAIN_SOUNDS; i++) {
            this.soundPain[i] = this.sound.add('voice-pain-' + i);
        }

        this.soundBall = [];
        for (var i = 0; i < 3; i++) {
            this.soundBall[i] = this.sound.add('voice-ball-' + i);
        }

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

            // Don't move the paddle if gamepad is enabled
            // I should probably kill the pointermove, but ...
            // this is easier.  haha
            if (!this.gamepadEnabled) {

                //  Keep the paddle within the game
                this.paddle.x = Phaser.Math.Clamp(pointer.x, 65, 735);

                if (this.ball.getData('onPaddle'))
                {
                    this.ball.x = this.paddle.x;
                }
            }

        }, this);

        this.input.on('pointerup', function (pointer) {

            this.actionButtonHandler();

        }, this);
        
        this.scoreText = this.add.bitmapText(10, 560, '8bit', '', 32).setOrigin(0).setLeftAlign();
        this.setScore(0);
        this.scoreText.visible = false;

        this.ballsText = this.add.bitmapText(800, 560, '8bit', '', 32).setOrigin(1, 0).setRightAlign();
        this.setRemainingBalls(0);
        this.ballsText.visible = false;

        this.introText = this.add.bitmapText(400, 300, '8bit', '', 24).setOrigin(0.5).setLeftAlign();
        this.introText.setText([
            'After the events in 1977 at'
            , 'Devils Tower Wyoming, the'
            , 'government sends an astronaut'
            , 'on a lonely mission to find'
            , 'the aliens, and discover the'
            , 'fate of the travellers that'
            , 'left Earth on the visitors\''
            , 'mothership.'
            , ''
            , 'This is the story of what'
            , 'happened to that brave'
            , 'astronaut.'
            , ''
            , 'CLICK TO BEGIN...'
        ]);
        this.introText.visible = false;

        // Add endgame image
        this.endgameOrigin = new Phaser.Geom.Point(-200, 500);
        this.endgame = this.add.image(this.endgameOrigin.x, this.endgameOrigin.y, 'endgame');
        this.endgame.angle = 15;
        this.endgame.visible = false;

        this.centeredText = this.add.bitmapText(400, 300, '8bit', '', 32).setOrigin(0.5).setCenterAlign();
        this.centeredText.visible = false;
        
        this.scanlines = this.add.image(400, 300, 'scanlines');

        this.title = this.add.image(400, 270, 'title');

        this.showMainMenu();
    },

    // This is the handler for both the mouse click and gamepad button
    actionButtonHandler: function() {
        
        switch (this.getGameState()) {

            case this.GS_GAME_INIT:
                this.showIntro();
                break;

            case this.GS_GAME_INTRO:
            case this.GS_GAME_OVER:
                this.startGame();
                break;

            case this.GS_GAME_ACTIVE:
                if (this.ball.getData('onPaddle')) {
                    this.ball.setData('onPaddle', false);
                    this.startLevel();
                }    
                break;
            
            default:
                console.log('UNKNOWN GAME STATE IN POINTERUP: ' + this.getGameState());
        }

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
            if (this.soundEnabled) {
                this.soundBrickHit[brickRow].play();
            }

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

        // Periodically the astronaut complains
        this.playPainSound();
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

            // Play the sound of the player spawning
            if (this.voiceEnabled) {
                this.soundBall[this.getRemainingBalls()].play();
            }

            // Reset the timer that controls the next time our astronaut makes a noise
            this.resetNextPainSound();
        }
    },

    // Kicks off the intro screen
    showIntro: function() {

        this.setGameState(this.GS_GAME_INTRO);
        
        this.hideCenteredText();

        // Hide the introText and peg its alpha to zero
        this.introText.alpha = 0;
        this.introText.visible = true;

        var tweenIntroTextFadeIn = this.tweens.add({
            targets: this.introText,
            alpha: 1.0,
            ease: 'Power1',
            duration: 1000,
            onComplete: this.introTextFadeInComplete,
            onCompleteParams: [this.scene]
        });
    },

    startGame: function()
    {
        console.log('welcome to startGame');

        this.introText.visible = false;

        // Reset variables at the start of the game
        this.level = 1;
        this.setScore(0);
        
        this.setRemainingBalls(3);

        this.resetBall();
        
        this.highestRowHit = 0;
        this.setGameState(this.GS_GAME_ACTIVE);

        this.fadeIn(this.paddle);

        // Hide the title screen and centered text
        this.fadeOut(this.title);
        this.fadeOut(this.centeredText);

        // Make endgame fade in a dramatic fashion
        this.tweens.add({
            targets: this.endgame
            , scale: 10
            , ease: 'Power1'
            , duration: 2200
        })
        this.fadeOut(this.endgame, 2000);


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

        if (this.soundEnabled) {
            this.soundPaddleHit.play();
        }

        // Periodically the astronaut complains
        this.playPainSound();
    },

    update: function (time, delta)
    {
        if (this.getGameState() == this.GS_GAMEPAD_CALIBRATION) {

            var mostTravel = 0;
            
            for (var a = 0; a < this.gamepad.axes.length; a++) {
                
                var axis = this.gamepad.axes[a];
                
                var axisIndex = axis.index;
                var axisValue = axis.getValue();
                
                // Store the lowest[0] and highest[1] values captured during calibration
                if (typeof(this.gamepadCalibrationValues[axisIndex]) != 'undefined') {

                    // Store the lowest value during calibration
                    this.gamepadCalibrationValues[axisIndex][0] = Math.min(axisValue, this.gamepadCalibrationValues[axisIndex][0]);

                    // Store the highest value during calibration
                    this.gamepadCalibrationValues[axisIndex][1] = Math.max(axisValue, this.gamepadCalibrationValues[axisIndex][1]);

                    // If this axis has traveled more than others, make it the standard
                    var travel = this.gamepadCalibrationValues[axisIndex][1] - this.gamepadCalibrationValues[axisIndex][0];
                    if (travel > mostTravel) {
                        mostTravel = travel;
                        this.gamepadAxis = axisIndex;
                    }
                } 
                else {
                    // Populate the axis for the first time
                    this.gamepadCalibrationValues[axis.index] = [axisValue, axisValue];
                }
            }
        }

        // Move the paddle if the gamepad is enabled
        if (this.gamepadEnabled) {
            
            // Calculate total range of the selected gamepad axis
            var gamepadRange = this.gamepadCalibrationValues[this.gamepadAxis][1] - this.gamepadCalibrationValues[this.gamepadAxis][0];

            // Get gamepad value and adjust it into the range where 0 is the min and the max value is the value of range
            var gamepadValue = this.gamepad.axes[this.gamepadAxis].getValue() - this.gamepadCalibrationValues[this.gamepadAxis][0];
            
            var pct = gamepadValue / gamepadRange;

            var MIN_X = 65;
            var MAX_X = 735;
            var RANGE_X = MAX_X - MIN_X;

            // Move the paddle in line with where we are in the axis travel
            this.paddle.x = (RANGE_X * pct) + MIN_X;

            if (this.ball.getData('onPaddle'))
            {
                this.ball.x = this.paddle.x;
            }
        }

        var velocityAdj = delta / 8;

        for (var i = 0; i < this.stars.length; i++)
        {
            var star = this.stars[i];
            var xv = this.getVelocity(star, 'x');
            var yv = this.getVelocity(star, 'y');
            star.x += xv * velocityAdj;
            star.y += yv * velocityAdj;

            if (star.x < 0 || star.x > 800 || star.y < 0 || star.y > 600) {
                star.x = 400;
                star.y = 300;
            }
        }

        this.ball.x += this.getVelocity(this.ball, 'x') * velocityAdj;
        this.ball.y += this.getVelocity(this.ball, 'y') * velocityAdj;

        // Let the ball go way out of bounds before resetting
        if (this.ball.y > 800 && this.getGameState() == this.GS_GAME_ACTIVE)
        {
            if (this.getRemainingBalls() > 0) {
                this.resetBall();
            } else {
                this.endGame();
            }
        }
        else if (this.ball.y <= 15)
        {
            this.ball.y = 15;
            this.bounceBallY();

            if (this.soundEnabled) {
                this.soundPaddleHit.play();
            }
        }

        var minX = 15;
        var maxX = 800 - 15;
        if (this.ball.x >= maxX)
        {
            this.ball.x = maxX;
            this.bounceBallX();
            if (this.soundEnabled) {
                this.soundPaddleHit.play();
            }
        } 
        else if (this.ball.x <= minX)
        {
            this.ball.x = minX;
            this.bounceBallX();
            if (this.soundEnabled) {
                this.soundPaddleHit.play();
            }
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

                // Fade bricks in row by row
                brick.alpha = 0;
                this.tweens.add({
                    targets: brick,
                    alpha: 1,
                    delay: 200 * i,
                    duration: 500,
                    repeat: 0
                });
    
                this.bricks.push(brick);
            }
        }

        // Fix the depth sorting
        this.ball.setDepth(1);
        this.endgame.setDepth(2);
        this.centeredText.setDepth(3);
        this.scoreText.setDepth(4);
        this.scanlines.setDepth(10);
        this.title.setDepth(100);
    },

    // Returns an integer random number within our min/max range
    rnd: function(min,max) {
        return Math.round(Math.random() * (max - min) + min);
    },

    endGame: function() {

        this.setGameState(this.GS_ENDGAME);

        this.stopBall();

        this.hideCenteredText();

        var tweenHidePaddle = this.tweens.add({
            targets: this.paddle
            , alpha: 0
            , delay: 125
            , duration: 250
            , repeat: 0
            , onComplete: function(paddle) { paddle.visible = false; }
            , onCompleteParams: [this.paddle]
        });

        // Reset the position of the endgame image offscreen
        this.endgame.setPosition(this.endgameOrigin.x, this.endgameOrigin.y);

        // Make the endgame graphic visible
        this.endgame.visible = true;
        this.endgame.alpha = 1;
        this.endgame.scale = 1;

        // Tween the image until it's shown at the edge of the screen
        this.tweenShowEndgame = this.tweens.add({
            targets: this.endgame
            , x: 240
            , y: 390
            , duration: 15000
            , repeat: 0
            , ease: 'Sine.easeOut'
            , onComplete: function() {
                var daGame = this.parent.scene; // Bust out of the stupid scope of the tween callback
                daGame.setGameState(daGame.GS_GAME_OVER);
            }
        });

        // Slowly rotate image to give it that zero-g feel
        var tween2 = this.tweens.add({
            targets: this.endgame
            , angle: this.endgame.angle + 2
            , duration: 5000
            , yoyo: true
            , repeat: -1
            , ease: 'Sine.easeInOut'
        });

        /*
        // Zero-g bob
        var tween3 = this.tweens.add({
            targets: this.endgame
            , y: '+=5'
            , duration: 4000
            , yoyo: true
            , repeat: -1
            , ease: 'Sine.easeInOut'
        });
        */
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
        this.ballsText.visible = true;
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
        this.scoreText.visible = true;
    },
    increaseScore: function(amt) {
        this.setScore(this._score + amt);
    },
    getGameState: function() {
        return this._gameState;
    },
    setGameState: function(gameState) {
        this._gameState = gameState;

        console.log('Changed game state: ' + this._gameState);

        // Do stuff based on the new gameState value
        switch (this._gameState) {

            case this.GS_GAME_OVER:
                this.setCenteredText(['', '', '','', '', '','', '', '', 'GAME OVER', '', 'CLICK TO START OVER']);
                break;
            
            default:
                console.log('   Taking no action');
        }

    },
    setCenteredText: function(text) {
        this.centeredText.setText(text);
        this.fadeIn(this.centeredText);
    },
    hideCenteredText: function() {
        this.fadeOut(this.centeredText);
    },
    fadeOut: function(obj, ms) {

        if (typeof(ms) == 'undefined') {
            ms = this.fadeSpeedMs;
        }

        this.tweens.add({
            targets: obj
            , alpha: 0
            , ease: 'Power1'
            , duration: ms
            , onComplete: function() {
                obj.visible = false;
            }
        })
    },
    fadeIn: function(obj, ms) {

        if (obj.visible && obj.alpha == 1) {
            console.log('obj is already visible - bailing');
            return;
        }

        if (typeof(ms) == 'undefined') {
            ms = this.fadeSpeedMs;
        }

        obj.alpha = 0;
        obj.visible = true;
        this.tweens.add({
            targets: obj
            , alpha: 1
            , ease: 'Power1'
            , duration: ms
        })
    },
    playPainSound: function() {

        // Bail if voice is disabled
        if (!this.voiceEnabled) {
            return;
        }

        // Don't play a sound if enough time hasn't passed
        if (this.game.getTime() < this.nextPainSound) {
            return;
        }

        // Prevent pain sound from repeating
        var soundIdx = 0;
        do {
            soundIdx = this.rnd(0, this.soundPain.length - 1);
        } while (soundIdx == this.lastPainSound);
        this.lastPainSound = soundIdx;

        // Play the sound
        this.soundPain[soundIdx].play();

        // Reset the timer that controls the frequency of the yelling
        this.resetNextPainSound();
    },
    resetNextPainSound: function() {
        this.nextPainSound = this.game.getTime() + this.rnd(4000, 8000);
    },

    cleanupMenu: function() {
        for (var i = 0; i < this.menuItems.length; i++) {
            this.menuItems[i].destroy();
        }
        this.menuItems = [];
    },

    onStartClick: function() {

        // Kill the menu
        this.cleanupMenu();

        // Start the intro
        this.showIntro();
    },

    onToggleVoices: function() {
        this.voiceEnabled = !this.voiceEnabled;
        this.showSettingsMenu(); // Redraw the menu to force the value to update
    },
    onToggleSound: function() {
        this.soundEnabled = !this.soundEnabled;
        this.showSettingsMenu(); // Redraw the menu to force the value to update
    },

    addMenuButton: function(label, callback) {

        var x = 180;
        var y = 240 + this.menuItems.length * 50;

        var item = this.add.bitmapText(x, y, '8bit', '', 32).setInteractive();
        item.setText(label);

        if (typeof(callback) != 'undefined') {
            item.once('pointerup', callback, this);
        }

        this.menuItems.push(item);
    },
    addMenuCheckbox: function(label, checked, callback) {
        var space = ' ';
        var NUM_SPACES = 12;
        this.addMenuButton(this.left(label + space.repeat(NUM_SPACES), NUM_SPACES) + (checked ? 'ON' : 'OFF'), callback);
    },

    showMainMenu: function() {
        this.cleanupMenu();
        this.addMenuButton('START', this.onStartClick);
        this.addMenuButton('SETTINGS', this.showSettingsMenu);
    },

    showSettingsMenu: function() {
        console.log('showSettingsMenu');
        this.cleanupMenu();
        this.addMenuCheckbox('VOICES', this.voiceEnabled, this.onToggleVoices);
        this.addMenuCheckbox('SOUND', this.soundEnabled, this.onToggleSound);
        this.addMenuCheckbox('GAMEPAD', this.gamepadEnabled, this.onToggleGamepad);
        this.addMenuButton(''); // Whitespace
        this.addMenuButton('BACK', this.showMainMenu);
    },

    onToggleGamepad: function() {

        this.cleanupMenu();

        console.log('gamepads: ' + this.input.gamepad.total);

        if (this.input.gamepad.total == 0) {

            this.addMenuButton('NO GAMEPAD FOUND', this.showSettingsMenu);
            this.addMenuButton('',);
            this.addMenuButton('CANCEL', this.showSettingsMenu);

        } else {

            this.addMenuButton('PRESS A BUTTON');
            this.addMenuButton('ON THE GAMEPAD',);
            this.addMenuButton('',);
            this.addMenuButton('CANCEL', this.showSettingsMenu);
    
            // Install gamepad event handler
            this.input.gamepad.once('down', function (pad, button, index) {

                console.log('Playing with ' + pad.id);
                
                this.gamepad = pad;
    
                // Reset the calibration values map
                this.gamepadCalibrationValues = {};
    
                this.showCalibrateGamepadMenu();
            }, this);
        }    
    },

    onAbortCalibration: function() { 
        this.gamepad = null;
        this.gamepadEnabled = false;
        this.input.gamepad.removeAllListeners();
        this.showSettingsMenu();
    },

    onFinalizeCalibration: function() {
        this.gamepadEnabled = true;
        this.showSettingsMenu();

        // Install the action button handler
        this.input.gamepad.on('down', this.actionButtonHandler, this);
    },

    showCalibrateGamepadMenu: function() {

        this.cleanupMenu();

        this.setGameState(this.GS_GAMEPAD_CALIBRATION);

        this.addMenuButton('MOVE THE GAMEPAD');
        this.addMenuButton('COMPLETELY RIGHT');
        this.addMenuButton(' AND LEFT THEN');
        this.addMenuButton('PRESS THE BUTTON');
        this.addMenuButton('',);
        this.addMenuButton('    CANCEL', this.onAbortCalibration);

        this.input.gamepad.once('down', this.onFinalizeCalibration, this);
    },

    // Returns the rightmost characters in a string
    right: function(str, chr) {
        return str.substr(str.length - chr, str.length);
    },
    left: function(str, chr) {
        return str.substr(0, chr);
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
    },
    input: {
        gamepad: true
    },
};

var game = new Phaser.Game(config);
