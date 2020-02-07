var Breakout = new Phaser.Class({

    Extends: Phaser.Scene,

    initialize:

    function Breakout ()
    {
        Phaser.Scene.call(this, { key: 'breakout' });

        this.bricks;
        this.paddle;
        this.ball;
    },

    preload: function ()
    {
        this.load.image('title', 'img/title.png');
        this.load.image('background', 'img/background.png');
        this.load.image('paddle', 'img/paddle.png');

        for (var i = 0; i < 5; i++) {
            this.load.image('brick' + i, 'img/brick-' + i + '.png');
        }

        this.load.image('ball', 'img/ball.png');
        this.load.atlas('explosion', 'img/explosion.png', 'img/explosion.json');

        this.load.audio('brick_hit', [
            'audio/explode.ogg',
            'audio/explode.mp3'
        ]);
    
    },

    create: function ()
    {
        this.score = 0;
        this.remainingBalls = 3;

        this.soundBrickHit = this.sound.add('brick_hit');

        this.add.image(400, 300, 'background');

        //  Enable world bounds, but disable the ceiling
        // this.physics.world.setBoundsCollision(true, true, true, false);
        this.matter.world.setBounds();

        // Disable gravity
        this.matter.world.disableGravity();

        this.bricks = [];

        //  Setting { min: x, max: y } will pick a random value between min and max
        //  Setting { start: x, end: y } will ease between start and end
    
        this.ball = this.add.sprite(400, 480, 'ball');
        this.ball.setData('xv', 0);
        this.ball.setData('yv', 0);

        // this.ball.setCollideWorldBounds(true);
        
        this.ball.setData('onPaddle', true);

        this.paddle = this.add.image(400, 500, 'paddle');

        /*
        //  Our colliders
        this.matter.add.collider(this.ball, this.bricks, this.hitBrick, null, this);
        this.matter.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);
        */
       this.matter.world.on('collisionstart', function (event, bodyA, bodyB) {

            

        /*
            bodyA.gameObject.setTint(0xff0000);
            bodyB.gameObject.setTint(0x00ff00);
        */

        });


        //  Input events
        this.input.on('pointermove', function (pointer) {

            //  Keep the paddle within the game
            this.paddle.x = Phaser.Math.Clamp(pointer.x, 52, 748);

            if (this.ball.getData('onPaddle'))
            {
                this.ball.x = this.paddle.x;
            }

        }, this);

        this.input.on('pointerup', function (pointer) {

            this.title.visible = false;

            if (this.ball.getData('onPaddle'))
            {
                this.ball.setData('xv', 0.5);
                this.ball.setData('yv', -6);

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
            this.ball.setData('xv', Math.abs(this.ball.getData('xv')) * -1);
        }
        // Right side of the brick
        else if (Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.left, ballBounds.top)
              || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.left, ballBounds.centerY)
              || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.left, ballBounds.bottom)
            )
        {
            this.ball.setData('xv', Math.abs(this.ball.getData('xv')));
        }

        // Hit the top side of the brick - Y should go negative
        if (Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.left,    ballBounds.bottom)
         || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.centerX, ballBounds.bottom)
         || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.right,   ballBounds.bottom)
            )
        {
            this.ball.setData('yv', Math.abs(this.ball.getData('yv')) * -1);   
        }
        // Hit bottom - ball should go positive
        if (Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.left,    ballBounds.top)
         || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.centerX, ballBounds.top)
         || Phaser.Geom.Rectangle.Contains(brickBounds, ballBounds.right,   ballBounds.top)
            )
        {
            this.ball.setData('yv', Math.abs(this.ball.getData('yv')));
        }

        brick.destroy();

        this.bricks = this.arrayRemove(this.bricks, brick);

        this.soundBrickHit.play();

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
    },

    hitPaddle: function (ball, paddle)
    {
        var diff = 0;

        this.setVelocity(ball, 'y', ball.getData('yv') * -1);

        if (ball.x < paddle.x)
        {
            //  Ball is on the left-hand side of the paddle
            diff = paddle.x - ball.x;
            this.setVelocity(ball, 'x', -0.5 * diff);
        }
        else if (ball.x > paddle.x)
        {
            //  Ball is on the right-hand side of the paddle
            diff = ball.x -paddle.x;
            this.setVelocity(ball, 'x', 0.5 * diff);
        }
        else
        {
            //  Ball is perfectly in the middle
            //  Add a little random X to stop it bouncing straight up!
            this.setVelocity(ball, 'x', 0.25 + Math.random() * 2);
        }
    },

    update: function ()
    {
        this.ball.x += this.ball.getData('xv');
        this.ball.y += this.ball.getData('yv');


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
        this.ball.setData('xv', 0);
        this.ball.setData('yv', 0);
    },
    bounceBall: function() {
        this.ball.setData('xv', this.ball.getData('xv') * -1);
        this.ball.setData('yv', this.ball.getData('yv') * -1);
    },
    bounceBallX: function() {
        this.ball.setData('xv', this.ball.getData('xv') * -1);
    },
    bounceBallY: function() {
        this.ball.setData('yv', this.ball.getData('yv') * -1);
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
