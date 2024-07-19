let game;

// global game options
let gameOptions = {

    // platform speed range, in pixels per second
    platformSpeedRange: [300, 300],
    // spawn range, how far should be the rightmost platform from the right edge
    // before next platform spawns, in pixels
    spawnRange: [80, 300],

    // platform width range, in pixels
    platformSizeRange: [90, 300],

    // a height range between rightmost platform and next platform to be spawned
    platformHeightRange: [-5, 5],

    // a scale to be multiplied by platformHeightRange
    platformHeighScale: 20,

    // platform max and min height, as screen height ratio
    platformVerticalLimit: [0.50, 0.8],

    // player gravity
    playerGravity: 900,

    // player jump force
    jumpForce: 450,

    // player starting X position
    playerStartPosition: 200,

    // consecutive jumps allowed
    jumps: 2,

    // % of probability a coin appears on the platform
    //set 35
    coinPercent: 100,

    // % of probability a enemy appears on the platform
    enemyPercent: 60

};

window.onload = function () {

    // object containing configuration options
    let gameConfig = {
        type: Phaser.AUTO,
        width: 900,
        height: 675,

        scene: [preloadGame, playGame],
        // physics settings
        physics: {
            default: "arcade",
            arcade: {
                debug: true
            }
        }
    };
    game = new Phaser.Game(gameConfig);
    window.focus();
    resize();
    window.addEventListener("resize", resize, false);
};

function resize() {
    let canvas = document.querySelector("canvas");
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let windowRatio = windowWidth / windowHeight;
    let gameRatio = game.config.width / game.config.height;
    if (windowRatio < gameRatio) {
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    }
    else {
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}

var highscore = 0;

// preloadGame scene
class preloadGame extends Phaser.Scene {
    constructor() {
        super("PreloadGame");
    }
    preload() {
        this.load.image("platform", "Assets/PixlSkateFloor.png");
        this.load.audio('powerMove', 'SFX/powerMove.wav');
        this.load.audio('jump', 'SFX/jump.wav');
        this.load.audio('gameOver', 'SFX/gameOver.wav');
        this.load.audio('pickupCoin', 'SFX/pickupCoin.wav');
        this.load.atlas("player", "Assets/katie.png", "Assets/katie.json")
        this.load.image("lights", "Assets/Light.png");
        this.load.image("enemy", "Assets/redshirt.png");
        this.load.image('background', 'Assets/background.png');
        this.load.image('coin', 'Assets/Star.png');
    }
    create() {
        this.scene.start("PlayGame");
    }
}
var health;
var lastHeight;
var sfx;
var jumpSound;
var deathSound;
var gameOver;
var pickupCoin;
var score;
var coinGroup = [];
var dropping;
var Highscore_Text
// playGame scene
class playGame extends Phaser.Scene {
    
    gui;
    dropping = false;
    constructor() {
        super("PlayGame");
    }
    create() {
        var bg = this.add.image(game.scale.width/2, game.scale.height/2, 'background');
        bg.setScale(2)
        var lights = this.add.image(game.scale.width/2, game.scale.height / 5.5, 'lights');
        lights.setScale(1.0);
        this.score = 0;
        //highscore = 0;
        console.log("start score " + this.score)
        dropping = false;
        gameOver = false;
        sfx = sfx || this.sound.add('powerMove');
        jumpSound = this.sound.add('jump');
        deathSound = this.sound.add('gameOver');
        pickupCoin = this.sound.add('pickupCoin');
        sfx.play();
        health = 3;
        this.gui = this.add.text(16, 16, '', { fontSize: '32px', fill: '#999' });
        this.Highscore_Text = this.add.text(16, 45, 'High Score', { fontSize: '32px', fill: '#999' });
        // group with all active platforms.
        this.platformGroup = this.add.group({

            // once a platform is removed, it's added to the pool
            removeCallback: function (platform) {
                platform.scene.platformPool.add(platform)
            }
        });

        // platform pool
        this.platformPool = this.add.group({

            // once a platform is removed from the pool, it's added to the active platforms group
            removeCallback: function (platform) {
                platform.scene.platformGroup.add(platform);
            }
        });

        // group with all active coins.
        this.coinGroup = this.add.group({

            // once a coin is removed, it's added to the pool
            removeCallback: function (coin) {
                coin.scene.coinPool.add(coin);
            }
        });

        // coin pool
        this.coinPool = this.add.group({

            // once a coin is removed from the pool, it's added to the active coins group
            removeCallback: function (coin) {
                coin.scene.coinGroup.add(coin);
                coinGroup.push(coin)
                console.log("In the active coins " + coinGroup[0])
            }
        });

        // group with all active enemy
        this.enemyGroup = this.add.group({

            // once an enemy is removed, it's added to the pool
            removeCallback: function (enemy) {
                enemy.scene.enemyPool.add(enemy);
            }
        });

        // enemy pool
        this.enemyPool = this.add.group({

            // once a enemy is removed from the pool, it's added to the active enemy group
            removeCallback: function (enemy) {
                enemy.scene.enemyGroup.add(enemy);
            }
        });

        // Function to start increasing the score every second
        var timer = this.time.addEvent({
            delay: 1000,
            callback: this.addScore,
            callbackScope: this,
            loop: true
        });

        // Initial display update
        this.updateScoreDisplay();

        // keeping track of added platforms
        this.addedPlatforms = 0;

        // number of consecutive jumps made by the player so far
        this.playerJumps = 0;

        // adding a platform to the game, the arguments are platform width, x position and y position
        this.addPlatform(game.config.width, game.config.width / 2, game.config.height * gameOptions.platformVerticalLimit[1]);

        // adding the player;
        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height * 0.5, "player");
        this.player.setGravityY(gameOptions.playerGravity);
        this.player.setDepth(2);
        this.anims.create({ key: 'katie_skating', frames: this.anims.generateFrameNames('player', { prefix: 'katierolling', start: 1, end: 5, zeroPad: 3 }), repeat: -1, frameRate: 7 });
        this.player.play('katie_skating')
        this.player.setScale(.17);
        this.player.setSize(500, 925, false);


        // the player is not dying
        this.dying = false;

        // setting collisions between the player and the platform group
        this.platformCollider = this.physics.add.collider(this.player, this.platformGroup, function () {

            // play "run" animation if the player is on a platform
            if(!this.player.anims.isPlaying)
            {
                this.player.anims.play("run");
            }
            this.dropping = false;
        }, null, this);

        // setting collisions between the player and the coin group
        this.physics.add.overlap(this.player, this.coinGroup, function (player, coin) {
            
            this.score += 5;
            
            this.tweens.add({
                targets: coin,
                y: coin.y - 100,
                alpha: 0,
                duration: 800,
                ease: "Cubic.easeOut",
                callbackScope: this,
                onComplete: function () {
                    pickupCoin.play();
                    console.log("score " + this.score); 
                    console.log(this.coinGroup[0])
                    this.coinGroup.killAndHide(coin);
                    this.coinGroup.remove(coin, true, true);
                }
            });

            coin.disableBody(false, false);

        }, null, this);

        // setting collisions between the player and the enemy group
        this.physics.add.overlap(this.player, this.enemyGroup, function (player, enemy) {
            console.log(this.dropping);
            if(this.dropping)
            {
                enemy.x = enemy.x + 100;
                this.enemyGroup.killAndHide(enemy);
                this.enemyGroup.remove(enemy);
                
            } else {health--;}   
            //move enemy that was hit (enemy) to the updated location
            if (health <= 0) {
                sfx.stop();
                this.dying = true;
                this.player.anims.stop();
                this.player.setFrame(2);
                this.player.body.setVelocityY(-200);
                this.physics.world.removeCollider(this.platformCollider);

            };


        }, null, this);

        // checking for input

        let up = this.input.keyboard.addKey('W');
        up.on("down", this.jump, this);
        let down = this.input.keyboard.addKey('S');
        down.on('down', this.quickDrop, this);

    }

    // Function to update the score display on the webpage
    updateScoreDisplay() {
        this.gui.setText(this.score);
        this.Highscore_Text.setText('High Score: ' + highscore);
        
    }
    // Function to increment the score
    addScore() {
        this.score++;
        if (highscore <= this.score){
            highscore = this.score;
        }
        this.updateScoreDisplay();
    }

    quickDrop() {
        if (!(this.player.body.touching.down) && !(this.dying)) {
            this.player.setVelocityY(1000);
            this.dropping = true;
            console.log()
        }
    }

    // the core of the script: platform are added from the pool or created on the fly
    addPlatform(platformWidth, posX, posY) {
        this.addedPlatforms++;
        let platform;
        if (this.platformPool.getLength()) {
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.y = posY;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
            let newRatio = platformWidth / platform.displayWidth;
            platform.displayWidth = platformWidth;
            platform.tileScaleX = 1 / platform.scaleX;
        }
        else {
            platform = this.add.tileSprite(posX, posY, platformWidth, 32, "platform");
            this.physics.add.existing(platform);
            platform.body.setImmovable(true);
            platform.body.setVelocityX(Phaser.Math.Between(gameOptions.platformSpeedRange[0], gameOptions.platformSpeedRange[1]) * -1);
            platform.setDepth(2);
            this.platformGroup.add(platform);
        }
        this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);

        // if this is not the starting platform...
        if (this.addedPlatforms > 1) {

            // is there a coin over the platform?
            if (Phaser.Math.Between(1, 100) <= gameOptions.coinPercent) {
                if (this.coinPool.getLength()) {
                    let coin = this.coinPool.getFirst();
                    coin.setScale(.3);
                    coin.x = posX - 100;
                    coin.y = posY - 96;
                    coin.alpha = 1;
                    coin.active = true;
                    coin.visible = true;
                    this.coinPool.remove(coin);
                }
                else {
                    let coin = this.physics.add.sprite(posX - 100, posY - 96, "coin");
                    coin.setScale(.3);
                    coin.setOffset(650, 22);
                    coin.setSize(95, 95, false);
                    coin.setImmovable(true);
                    coin.setVelocityX(platform.body.velocity.x);
                    coin.setDepth(2);
                    this.coinGroup.add(coin);
                    //this.coinGroup.push(coin)
                    console.log("adding coin " + coinGroup[0])
                }
            }

            // is there a enemy over the platform?
            if ((Phaser.Math.Between(1, 100) <= gameOptions.enemyPercent) && (platformWidth > 150)) {
                if (this.enemyPool.getLength()) {
                    let enemy = this.enemyPool.getFirst();
                    enemy.setScale(.13)
                    enemy.x = posX - platformWidth / 2 + Phaser.Math.Between(1, platformWidth);
                    enemy.y = posY - 75;
                    enemy.alpha = 1;
                    enemy.active = true;
                    enemy.visible = true;
                    this.enemyPool.remove(enemy);
                }
                else {
                    let enemy = this.physics.add.sprite(posX - platformWidth / 2 + Phaser.Math.Between(1, platformWidth), posY - 75, "enemy");
                    enemy.setScale(.13)
                    enemy.setImmovable(true);
                    enemy.setVelocityX(platform.body.velocity.x);
                    enemy.setSize(8, 2, true);
                    enemy.setDepth(2);
                    this.enemyGroup.add(enemy);
                }
            }
        }
    }


    jump() {
        if ((!this.dying) && (this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps))) {
            if (this.player.body.touching.down) {
                this.playerJumps = 0;
            }
            this.player.setVelocityY(gameOptions.jumpForce * -1);
            this.playerJumps++;
            jumpSound.play();
            // stops animation
            this.player.anims.stop();
        }
    }

    update() {

        // game over
        if (!gameOver && this.player.y > game.config.height) {
            gameOver = true;
            sfx.stop();
            deathSound.play();
            this.time.delayedCall(2600, () => this.scene.start("PlayGame"), null, this);
            if (this.player.y > game.config.height) {
                sfx.stop();
                this.gui.setText(0);
                this.score = 0;
                sfx.stop();
                this.scene.start("PlayGame");
            }
        }
        this.player.x = gameOptions.playerStartPosition;
        // recycling platforms
        let minDistance = game.config.width;
        let rightmostPlatformHeight = 0;
        this.platformGroup.getChildren().forEach(function (platform) {
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            if (platformDistance < minDistance) {
                minDistance = platformDistance;
                rightmostPlatformHeight = platform.y;
            }
            if (platform.x < - platform.displayWidth / 2) {
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        // recycling coins
        this.coinGroup.getChildren().forEach(function (coin) {
            if (coin.x < - coin.displayWidth / 2) {
                this.coinGroup.killAndHide(coin);
                this.coinGroup.remove(coin);
            }
        }, this);

        // recycling enemy
        this.enemyGroup.getChildren().forEach(function (enemy) {
            if (enemy.x < - enemy.displayWidth / 2) {
                this.enemyGroup.killAndHide(enemy);
                this.enemyGroup.remove(enemy);
            }
        }, this);

        // adding new platforms
        if (minDistance > this.nextPlatformDistance) {
            let nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1]);
            let platformRandomHeight = gameOptions.platformHeighScale * Phaser.Math.Between(gameOptions.platformHeightRange[0], gameOptions.platformHeightRange[1]);
            let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight;
            let minPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[0];
            let maxPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[1];
            let nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2, nextPlatformHeight);
        }

    }
}
