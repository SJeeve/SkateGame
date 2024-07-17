class playGame extends Phaser.Scene {
    constructor() {
        super("PlayGame");
    }

    preload() {
        this.load.image("platform", "/Assets/platform.png");
        this.load.image("playerSprite", "/Assets/test.png");
    }

    create() {
        let cursors = this.input.keyboard.createCursorKeys();
        let down = this.input.keyboard.addKey('S');
        let jumpButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        down.on('down', this.quickDrop, this);
        jumpButton.on('down', this.jump, this); // Changed event to 'down'

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
        this.physics.add.collider(this.player, this.platformGroup);

        // Additional variables for jump handling
        this.isJumping = false;
        this.jumpPower = 0;
    }

    quickDrop() {
        if (!(this.player.body.touching.down)) {
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
            console.log(difference);
            platform = this.physics.add.sprite(posX, (game.config.height * 0.8) + difference, "platform");
            platform.setImmovable(true);
            platform.setVelocityX(gameOptions.platformStartSpeed * -1);
            this.platformGroup.add(platform);
        }
        platform.displayWidth = platformWidth;
        this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);
    }

    jump() {
        if (this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps)) {
            if (this.player.body.touching.down) {
                this.playerJumps = 0;
            }
            gameOptions.playerGravity = 450;
            this.player.setVelocityY(gameOptions.jumpForce * -1);
            this.playerJumps++;
        }
    }

    update() {
        if (this.player.y > game.config.height) {
            this.scene.start("PlayGame");
        }
        this.player.x = gameOptions.playerStartPosition;
        gameOptions.playerGravity = 900;

        let minDistance = game.config.width;
        this.platformGroup.getChildren().forEach(function(platform) {
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            minDistance = Math.min(minDistance, platformDistance);
            if (platform.x < - platform.displayWidth / 2) {
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        if (minDistance > this.nextPlatformDistance) {
            var nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1]);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2);
        }

        // Handle jumping
        if (Phaser.Input.Keyboard.DownDuration(jumpButton, 150)) {
            if (!this.isJumping) {
                this.isJumping = true;
                this.jumpPower = 0;
            }
        }

        if (this.isJumping && Phaser.Input.Keyboard.UpDuration(jumpButton)) {
            this.jump();
        }

        if (this.isJumping) {
            this.player.setVelocityY(-this.jumpPower);
            this.jumpPower += 10;
        }
    }

    resize() {
        let canvas = document.querySelector("canvas");
        let windowWidth = window.innerWidth;
        let windowHeight = window.innerHeight;
        let windowRatio = windowWidth / windowHeight;
        let gameRatio = game.config.width / game.config.height;
        if(windowRatio < gameRatio){
            canvas.style.width = windowWidth + "px";
            canvas.style.height = (windowWidth / gameRatio) + "px";
        }
        else{
            canvas.style.width = (windowHeight * gameRatio) + "px";
            canvas.style.height = windowHeight + "px";
        }
    }
}