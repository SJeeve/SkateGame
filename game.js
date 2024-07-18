let game;

// global game options
let gameOptions = {
    platformStartSpeed: 350,
    spawnRange: [100, 350],
    platformSizeRange: [150, 500],
    playerGravity: 900,
    player_Gravity: 900,
    jumpForce: 400,
    playerStartPosition: 200,
    jumps: 2,
    firstPlatform: true,
    gravity: 10,
    jumpStrength: 100, // Consistent naming
};

const gravity = 10;
let jumpStrength = gameOptions.jumpStrength;

window.onload = function() {
    let gameConfig = {
        type: Phaser.AUTO,
        width: 1000,
        height: 800,
        scene: playGame,
        backgroundColor: 0x444444,
        physics: {
            default: "arcade",
            arcade: {
                debug: true
            }
        },
        fps: {
            target: 60,
            forceSetTimeOut: true
        }
    };
    game = new Phaser.Game(gameConfig);
    window.focus();
    resize();
    window.addEventListener("resize", resize, false);
};

class playGame extends Phaser.Scene {
    constructor() {
        super("PlayGame");
        this.space = null;
    }

    preload() {
        this.load.image("platform", "/Assets/platform.png");
        this.load.image("playerSprite", "/Assets/test.png");
    }

    create() {
        this.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        let cursors = this.input.keyboard.createCursorKeys();
        let down = this.input.keyboard.addKey('S');
        down.on('down', this.quickDrop, this);

        this.platformGroup = this.add.group({
            removeCallback: function(platform) {
                platform.scene.platformPool.add(platform);
            }
        });

        this.platformPool = this.add.group({
            removeCallback: function(platform) {
                platform.scene.platformGroup.add(platform);
            }
        });

        this.playerJumps = 0;
        this.addPlatform(game.config.width, game.config.width / 2);

        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height / 2, "playerSprite");
        this.player.setGravityY(gameOptions.playerGravity);
        this.player.scaleX = 0.2;
        this.player.scaleY = 0.2;
        this.player.body.setSize(300, 1000);

        this.physics.add.collider(this.player, this.platformGroup);
    }

    quickDrop() {
        if (!this.player.body.touching.down) {
            this.player.setVelocityY(2500);
        }
    }

    addPlatform(platformWidth, posX) {
        let platform;
        if (this.platformPool.getLength()) {
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
        } else {
            let difference = Phaser.Math.Between(-200.0, 200.0);
            if (this.platformGroup.getLength() < 1) {
                difference = 0;
            }
            platform = this.physics.add.sprite(posX, (game.config.height * 0.8) + difference, "platform");
            platform.setImmovable(true);
            platform.setVelocityX(gameOptions.platformStartSpeed * -1);
            this.platformGroup.add(platform);
        }
        platform.displayWidth = platformWidth;
        this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);
    }
    update() {
        if (this.player.y > game.config.height) {
            console.log("Game over: restarting scene");
            this.scene.restart();
        }

        this.player.x = gameOptions.playerStartPosition;

        if (this.player.body.touching.down) {
            jumpStrength = gameOptions.jumpStrength;
        } else if (!this.player.body.touching.down) {
            if (this.space.isDown) {
                this.player.setVelocityY(-jumpStrength);
                jumpStrength /= 1.15;
            }
            this.player.setVelocityY(this.player.body.velocity.y + gameOptions.gravity);
        } else {
            jumpStrength = 0;
        }
    update();
        // game over
        if(this.player.y > game.config.height){
            this.scene.start("PlayGame");
        }
        this.player.x = gameOptions.playerStartPosition;
        if(this.player.body.touching.down && this.space.isDown){
            if(gameOptions.playerGravity === gameOptions.player_Gravity)
            {
                gameOptions.playerGravity = gameOptions.player_Gravity / 2;
                this.player.setVelocityY(-100);
            }
        } else if(!(this.player.body.touching.down) && !(this.space.isDown))
        {
            this.player.setVelocityY(-100);
            gameOptions.playerGravity = gameOptions.player_Gravity;
        } else if(!(this.player.body.touching.down) && this.space.isDown)
        {
            if(gameOptions.playerGravity < 900)
            {
                this.player.setVelocityY(-100);
                gameOptions.playerGravity += 50;
            }
        }

        let minDistance = game.config.width;
        this.platformGroup.getChildren().forEach(function(platform) {
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            minDistance = Math.min(minDistance, platformDistance);
            if (platform.x < -platform.displayWidth / 2) {
                console.log("Recycling platform:", platform);
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        if (minDistance > this.nextPlatformDistance) {
            var nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1]);
            console.log("Adding new platform with width:", nextPlatformWidth);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2);
        }
    }
}

function resize() {
    let canvas = document.querySelector("canvas");
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let windowRatio = windowWidth / windowHeight;
    let gameRatio = game.config.width / game.config.height;
    if (windowRatio < gameRatio) {
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    } else {
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}
