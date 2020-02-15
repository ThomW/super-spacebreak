var Breakout = new Phaser.Class({

    Extends: Phaser.Scene,

    initialize:

    function Breakout ()
    {
        Phaser.Scene.call(this, { key: 'breakout' });

        this.gameOver = true;

        this.score;
        this.remainingBalls;
        this.level;
        this.highestRowHit;

        this.bricks;
        this.paddle;
        this.ball;
        this.stars;
        this.astronaut;
    },

    preload: function ()
    {
        this.load.image('title', 'img/title.jpg');
        this.load.image('background', 'img/background.png');
        this.load.image('paddle', 'img/paddle.png');

        this.load.image('astro-head', 'img/astro-head.png');
        this.load.image('astro-torso', 'img/astro-torso.png');
        this.load.image('astro-upper-arm', 'img/astro-upper-arm.png');
        this.load.image('astro-lower-arm', 'img/astro-lower-arm.png');
        this.load.image('astro-upper-leg', 'img/astro-upper-leg.png');
        this.load.image('astro-lower-leg', 'img/astro-lower-leg.png');

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
    },

    create: function ()
    {
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

        this.ball = this.add.sprite(400, 480, 'ball');
        this.setVelocity(this.ball, 'x', 0.0);
        this.setVelocity(this.ball, 'y', 0.0);

        this.stopBall();
        this.ball.setData('onPaddle', true);

        // The paddle is a matter physics object so that the astronaut can slam into it
        this.paddle = this.matter.add.image(400, 500, 'paddle').setStatic(true);

        // Instantiate our astronaut
        this.astronaut = new ragdoll(400, 600, 0.4);
        this.matter.world.add(this.astronaut);

        for (var i = 0; i < this.astronaut.bodies.length; i++) {
            body = this.astronaut.bodies[i];
            if (body.label == 'left-hand') {
                this.matter.add.constraint(this.paddle, body, 10, 1);
                break;
            }
        }

        // There's no x gravity and gravity in the positive Y direction
        this.matter.world.setGravity(0, 0, 0.005);

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

            if (this.ball.getData('onPaddle'))
            {
                this.ball.setData('onPaddle', false);

                if (this.gameOver) {
                    this.startGame();
                } else {
                    this.startLevel();
                }
            }

        }, this);
        
        this.scoreText = this.add.text(10, 570, 'SCORE: 0', { fontSize: '32px', fill: '#fff' });
        this.ballsText = this.add.text(600, 570, 'SHOTS: 3', { fontSize: '32px', fill: '#fff' });

        this.resetBricks();

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

            // Destroy and remove the brick from the collection
            brick.destroy();
            this.bricks = this.arrayRemove(this.bricks, brick);

            this.updateScore(1);

            if (this.bricks.length === 0)
            {
                this.levelUp();
            }
        }
    },

    resetBall: function ()
    {
        if (this.remainingBalls > 0) {

            this.remainingBalls -= 1;

            this.ballsText.setText('SHOTS: ' + this.remainingBalls);

            this.stopBall();

            this.ball.setPosition(this.paddle.x, 478);
            this.ball.setData('onPaddle', true);

            // Reset the highest row hit to the bottom row
            this.highestRowHit = 0;
        }
    },

    startGame: function()
    {
        // Reset variables at the start of the game
        this.level = 1;
        this.score = 0;
        this.remainingBalls = 3;
        this.highestRowHit = 0;
        this.gameOver = false;

        // Hide the title screen
        this.title.visible = false;

        // Call levelUp to kick things into gear
        this.startLevel();
    },

    // This basically returns the current value we're using for the hypotenuse of our angles.
    // It's calculated based on the default velocity at the beginning of the game, scaled up 
    // based on the level the player is on, and the highest row of blocks hit on this level.
    getCurrentVelocity: function()
    {
        var ret = this.ballDefaultVelocity + ((this.level - 1) * 0.75) + (this.highestRowHit * 0.5);
        // console.log('Velocity: ' + ret);
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
        var maxAngle = 40.0;

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

    update: function ()
    {
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

        if (this.ball.y > 600)
        {
            if (this.remainingBalls > 0) {
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
        this.resetBall();

        // Clear out all of the brick objects
        while (this.bricks.length)
        {
            this.matter.world.remove(this.bricks[0]);
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

        // Bring the ball to the top of the z-order
        this.ball.setDepth(1);
    },

    // Returns an integer random number within our min/max range
    rnd: function(min,max) {
        return Math.round(Math.random() * (max - min) + min);
    },

    updateScore: function(amt)
    {
        this.score += amt;
        this.scoreText.setText('SCORE: ' + this.score);
    },

    endGame: function() {

        this.gameOver = true;

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
    }
});

var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'gamebox',
    scene: [ Breakout ],
    physics: {
        default: 'matter',
        matter: {
            debug: true
        }
    }
};

var game = new Phaser.Game(config);
