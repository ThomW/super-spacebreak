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
        this.physics.world.setBoundsCollision(true, true, true, false);

        this.bricks = this.physics.add.staticGroup();

        //  Setting { min: x, max: y } will pick a random value between min and max
        //  Setting { start: x, end: y } will ease between start and end
    
        this.ball = this.physics.add.image(400, 480, 'ball').setCollideWorldBounds(true).setBounce(1);
        this.ball.setData('onPaddle', true);

        this.paddle = this.physics.add.image(400, 500, 'paddle').setImmovable();

        //  Our colliders
        this.physics.add.collider(this.ball, this.bricks, this.hitBrick, null, this);
        this.physics.add.collider(this.ball, this.paddle, this.hitPaddle, null, this);

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
                this.ball.setVelocity(75, -300);
                this.ball.setData('onPaddle', false);
            }

        }, this);
        
        this.scoreText = this.add.text(10, 10, 'SCORE: 0', { fontSize: '32px', fill: '#fff' });
        this.ballsText = this.add.text(600, 10, 'SHOTS: 3', { fontSize: '32px', fill: '#fff' });

        this.resetBricks();

        this.title = this.add.image(400, 300, 'title');
    },

    hitBrick: function (ball, brick)
    {
        brick.disableBody(true, true);

        this.soundBrickHit.play();

        this.updateScore(1);

        if (this.bricks.countActive() === 0)
        {
            this.resetLevel();
        }
    },

    resetBall: function ()
    {
        if (this.remainingBalls > 0) {

            this.remainingBalls -= 1;

            this.ballsText.setText('SHOTS: ' + this.remainingBalls);

            this.ball.setVelocity(0);
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

        if (ball.x < paddle.x)
        {
            //  Ball is on the left-hand side of the paddle
            diff = paddle.x - ball.x;
            ball.setVelocityX(-10 * diff);
        }
        else if (ball.x > paddle.x)
        {
            //  Ball is on the right-hand side of the paddle
            diff = ball.x -paddle.x;
            ball.setVelocityX(10 * diff);
        }
        else
        {
            //  Ball is perfectly in the middle
            //  Add a little random X to stop it bouncing straight up!
            ball.setVelocityX(2 + Math.random() * 8);
        }
    },

    update: function ()
    {
        if (this.ball.y > 600)
        {
            if (this.remainingBalls > 0) {
                this.resetBall();
            } else {
                this.gameOver();
            }
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

        // Clear out the current bricks
        this.bricks.clear(true, true);

        var colors = [0xD62226, 0xF5C603, 0x01AA31, 0x1FC3CD, 0x4542B9, 0x411271];

        // Draw the bricks
        for (var i = 0; i < 5; i++)
        {
            var rowColor = colors[i % colors.length];

            for (var j = 0; j < 13; j++)
            {
                var brickIdx = 'brick' + (i % 5);
                var brick = this.bricks.create(57 + j * 57, 150 + i * 25, brickIdx);
                brick.visible = true;                
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

    }
});

var config = {
    type: Phaser.CANVAS,
    width: 800,
    height: 600,
    parent: 'gamebox',
    scene: [ Breakout ],
    physics: {
        default: 'arcade'
    }
};

var game = new Phaser.Game(config);
