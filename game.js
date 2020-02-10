var Breakout = new Phaser.Class({

    Extends: Phaser.Scene,

    initialize:

    function Breakout ()
    {
        Phaser.Scene.call(this, { key: 'breakout' });

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
        this.score = 0;
        this.remainingBalls = 3;
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

        //  Enable world bounds, but disable the ceiling
        // this.physics.world.setBoundsCollision(true, true, true, false);
        this.matter.world.setBounds();

        // Disable gravity
        this.matter.world.disableGravity();

        this.bricks = [];

        this.ball = this.add.sprite(400, 480, 'ball');
        this.setVelocity(this.ball, 'x', 0.0);
        this.setVelocity(this.ball, 'y', 0.0);

        this.stopBall();
        this.ball.setData('onPaddle', true);

        this.paddle = this.add.image(400, 500, 'paddle');

       this.matter.world.on('collisionstart', function (event, bodyA, bodyB) {
        /*
            bodyA.gameObject.setTint(0xff0000);
            bodyB.gameObject.setTint(0x00ff00);
        */

        });


        //  Input events
        this.input.on('pointermove', function (pointer) {

            //  Keep the paddle within the game
            this.paddle.x = Phaser.Math.Clamp(pointer.x, 80, 720);

            if (this.ball.getData('onPaddle'))
            {
                this.ball.x = this.paddle.x;
            }

        }, this);

        this.input.on('pointerup', function (pointer) {

            this.title.visible = false;

            if (this.ball.getData('onPaddle'))
            {
                this.setVelocity(this.ball, 'x', 0);
                this.setVelocity(this.ball, 'y', -3);
                this.ball.setData('onPaddle', false);
            }

        }, this);
        
        this.scoreText = this.add.text(10, 10, 'SCORE: 0', { fontSize: '32px', fill: '#fff' });
        this.ballsText = this.add.text(600, 10, 'SHOTS: 3', { fontSize: '32px', fill: '#fff' });

        this.resetBricks();

        this.title = this.add.image(400, 300, 'title');
    },

    hitBrick: function (brick)
    {
        // Figure out what part of the ball overlaps with the brick to bounce correctly
        var ballBounds = this.ball.getBounds();
        var brickBounds = brick.getBounds();

        // I have to do a bunch of this work because the ball is so large.

        // Hit somewhere on left side of the brick, meaning x should go negative
        if (Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.right, ballBounds.top)
            || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.right, ballBounds.centerY)
            || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.right, ballBounds.bottom)
            )
        {
            this.setVelocity(this.ball, 'x', Math.abs(this.getVelocity(this.ball, 'x')) * -1);
        }
        // Right side of the brick
        else if (Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.left, ballBounds.top)
              || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.left, ballBounds.centerY)
              || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.left, ballBounds.bottom)
            )
        {
            this.setVelocity(this.ball, 'x', Math.abs(this.getVelocity(this.ball, 'x')));
        }

        // Hit the top side of the brick - Y should go negative
        if (Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.left,    ballBounds.bottom)
         || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.centerX, ballBounds.bottom)
         || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.right,   ballBounds.bottom)
            )
        {
            this.setVelocity(this.ball, 'y', Math.abs(this.getVelocity(this.ball, 'y')) * -1);   
        }
        // Hit bottom - ball should go positive
        if (Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.left,    ballBounds.top)
         || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.centerX, ballBounds.top)
         || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.right,   ballBounds.top)
            )
        {
            this.setVelocity(this.ball, 'y', Math.abs(this.getVelocity(this.ball, 'y')));
        }

        this.soundBrickHit[brick.getData('row')].play();

        // Destroy and remove the brick from the collection
        brick.destroy();
        this.bricks = this.arrayRemove(this.bricks, brick);

        this.updateScore(1);

        if (this.bricks.length === 0)
        {
            this.resetLevel();
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
        }
    },

    resetLevel: function ()
    {
        this.resetBricks();

        this.stopBall();
        this.ball.setPosition(this.paddle.x, 478);
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
        var xVel = Math.cos(angle) * this.ballDefaultVelocity;
        var yVel = Math.sin(angle) * this.ballDefaultVelocity;

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
                this.gameOver();
            }
        }
        else if (this.ball.y < 100)
        {
            this.bounceBallY();
        }

        if (this.ball.x > 775)
        {
            this.ball.x = 775;
            this.bounceBallX();
        } 
        else if (this.ball.x < 25)
        {
            this.ball.x = 25;
            this.bounceBallX();
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
        var brickSpeed = 0.05;
        var lowestBrickY = 100000;
        for (var i = 0; i < this.bricks.getChildren().length; i++)
        {
            this.bricks.getChildren()[i].y += brickSpeed;
            this.bricks.getChildren()[i].body.y += brickSpeed;
            lowestBrickY = Math.min(this.bricks.getChildren()[i].y, lowestBrickY);
        }
        */
        

    },

    resetBricks : function() 
    {
        this.resetBall();

        // Clear out all of the brick objects
        while (this.bricks.length)
        {
            Matter.World.remove(this.bricks[0]);
            bricks.shift();
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

    gameOver: function() {

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
    type: Phaser.CANVAS,
    width: 800,
    height: 600,
    parent: 'gamebox',
    scene: [ Breakout ],
    physics: {
        default: 'matter'
    }
};

var game = new Phaser.Game(config);
