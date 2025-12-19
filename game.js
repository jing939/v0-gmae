// ============================================
// 게임 설정 및 상수
// ============================================

const CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  TANK_SIZE: 40,
  TANK_SPEED: 3,
  BULLET_SIZE: 8,
  BULLET_SPEED: 8,
  EXPLOSION_RADIUS: 80,
  EXPLOSION_DAMAGE: 40,
  WALL_SIZE: 40,
  PARTICLE_COUNT: 20,
  ENEMY_SHOOT_COOLDOWN: 2000, // 적 발사 쿨다운 (밀리초)
  PLAYER_SHOOT_COOLDOWN: 500, // 플레이어 발사 쿨다운
}

// ============================================
// 유틸리티 함수
// ============================================

// 두 점 사이의 거리 계산
function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// 각도를 라디안으로 변환
function toRadians(angle) {
  return (angle * Math.PI) / 180
}

// 충돌 감지 (원형)
function circleCollision(obj1, obj2, r1, r2) {
  return distance(obj1.x, obj1.y, obj2.x, obj2.y) < r1 + r2
}

// 사각형 충돌 감지
function rectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2
}

// ============================================
// Particle 클래스 (폭발 효과)
// ============================================

class Particle {
  constructor(x, y) {
    this.x = x
    this.y = y
    // 랜덤한 방향으로 파티클 발사
    this.vx = (Math.random() - 0.5) * 10
    this.vy = (Math.random() - 0.5) * 10
    this.life = 1 // 생명력 (1에서 0으로 감소)
    this.size = Math.random() * 5 + 3
    this.color = `hsl(${Math.random() * 60 + 10}, 100%, 50%)` // 주황-빨강 계열
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vy += 0.2 // 중력 효과
    this.life -= 0.02 // 서서히 사라짐
  }

  draw(ctx) {
    ctx.save()
    ctx.globalAlpha = this.life
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  isDead() {
    return this.life <= 0
  }
}

// ============================================
// Wall 클래스 (벽/장애물)
// ============================================

class Wall {
  constructor(x, y, type = "brick") {
    this.x = x
    this.y = y
    this.width = CONFIG.WALL_SIZE
    this.height = CONFIG.WALL_SIZE
    this.type = type // 'brick' (파괴 가능) 또는 'steel' (파괴 불가)
    this.hp = type === "brick" ? 50 : 999999
  }

  takeDamage(damage) {
    if (this.type === "brick") {
      this.hp -= damage
      return this.hp <= 0
    }
    return false
  }

  draw(ctx) {
    if (this.type === "brick") {
      // 벽돌 벽 그리기
      ctx.fillStyle = "#8B4513"
      ctx.fillRect(this.x, this.y, this.width, this.height)
      ctx.strokeStyle = "#654321"
      ctx.lineWidth = 2
      ctx.strokeRect(this.x, this.y, this.width, this.height)

      // 벽돌 패턴
      ctx.strokeStyle = "#654321"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(this.x, this.y + this.height / 2)
      ctx.lineTo(this.x + this.width, this.y + this.height / 2)
      ctx.stroke()
    } else {
      // 강철 벽 그리기
      ctx.fillStyle = "#708090"
      ctx.fillRect(this.x, this.y, this.width, this.height)
      ctx.strokeStyle = "#2F4F4F"
      ctx.lineWidth = 3
      ctx.strokeRect(this.x, this.y, this.width, this.height)

      // 강철 패턴
      ctx.strokeStyle = "#DCDCDC"
      ctx.lineWidth = 1
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(this.x + (i * this.width) / 3, this.y)
        ctx.lineTo(this.x + (i * this.width) / 3, this.y + this.height)
        ctx.stroke()
      }
    }
  }
}

// ============================================
// Bullet 클래스 (총알)
// ============================================

class Bullet {
  constructor(x, y, angle, isPlayer = false) {
    this.x = x
    this.y = y
    this.angle = angle
    this.isPlayer = isPlayer // 플레이어의 총알인지 여부
    this.speed = CONFIG.BULLET_SPEED
    this.size = CONFIG.BULLET_SIZE
    this.active = true

    // 이동 방향 계산
    this.vx = Math.cos(toRadians(angle)) * this.speed
    this.vy = Math.sin(toRadians(angle)) * this.speed
  }

  update() {
    this.x += this.vx
    this.y += this.vy

    // 화면 밖으로 나가면 비활성화
    if (this.x < 0 || this.x > CONFIG.CANVAS_WIDTH || this.y < 0 || this.y > CONFIG.CANVAS_HEIGHT) {
      this.active = false
    }
  }

  draw(ctx) {
    ctx.save()
    ctx.fillStyle = this.isPlayer ? "#4ecca3" : "#ff6b6b"
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()

    // 총알 외곽선
    ctx.strokeStyle = this.isPlayer ? "#45b393" : "#ee5a6f"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }
}

// ============================================
// Tank 클래스 (탱크)
// ============================================

class Tank {
  constructor(x, y, isPlayer = false) {
    this.x = x
    this.y = y
    this.size = CONFIG.TANK_SIZE
    this.angle = 0 // 탱크가 향하는 각도
    this.speed = CONFIG.TANK_SPEED
    this.isPlayer = isPlayer
    this.hp = 100
    this.maxHp = 100
    this.lastShootTime = 0
    this.shootCooldown = isPlayer ? CONFIG.PLAYER_SHOOT_COOLDOWN : CONFIG.ENEMY_SHOOT_COOLDOWN

    // AI 관련 변수 (적 탱크용)
    if (!isPlayer) {
      this.aiTimer = 0
      this.aiDirection = Math.random() * 360
      this.aiChangeInterval = Math.random() * 2000 + 1000 // 1-3초마다 방향 변경
    }
  }

  // 이동
  move(dx, dy, walls, otherTanks) {
    const newX = this.x + dx * this.speed
    const newY = this.y + dy * this.speed

    // 화면 경계 체크
    if (newX - this.size / 2 < 0 || newX + this.size / 2 > CONFIG.CANVAS_WIDTH) return
    if (newY - this.size / 2 < 0 || newY + this.size / 2 > CONFIG.CANVAS_HEIGHT) return

    // 벽 충돌 체크
    let collision = false
    for (const wall of walls) {
      if (
        rectCollision(
          newX - this.size / 2,
          newY - this.size / 2,
          this.size,
          this.size,
          wall.x,
          wall.y,
          wall.width,
          wall.height,
        )
      ) {
        collision = true
        break
      }
    }

    // 다른 탱크와 충돌 체크
    for (const tank of otherTanks) {
      if (tank !== this && circleCollision({ x: newX, y: newY }, tank, this.size / 2, tank.size / 2)) {
        collision = true
        break
      }
    }

    if (!collision) {
      this.x = newX
      this.y = newY
    }
  }

  // 총알 발사
  shoot(targetAngle = null) {
    const now = Date.now()
    if (now - this.lastShootTime < this.shootCooldown) {
      return null // 쿨다운 중
    }

    this.lastShootTime = now

    // 총구 위치 계산
    const angle = targetAngle !== null ? targetAngle : this.angle
    const barrelLength = this.size / 2 + 10
    const bulletX = this.x + Math.cos(toRadians(angle)) * barrelLength
    const bulletY = this.y + Math.sin(toRadians(angle)) * barrelLength

    return new Bullet(bulletX, bulletY, angle, this.isPlayer)
  }

  // 피해 입기
  takeDamage(damage) {
    this.hp -= damage
    if (this.hp < 0) this.hp = 0
    return this.hp <= 0
  }

  // AI 업데이트 (적 탱크용)
  updateAI(player, walls, otherTanks, deltaTime) {
    if (this.isPlayer) return null

    this.aiTimer += deltaTime

    // 일정 시간마다 방향 변경
    if (this.aiTimer > this.aiChangeInterval) {
      this.aiTimer = 0
      this.aiDirection = Math.random() * 360
      this.aiChangeInterval = Math.random() * 2000 + 1000
    }

    // 플레이어를 향해 회전
    const dx = player.x - this.x
    const dy = player.y - this.y
    this.angle = (Math.atan2(dy, dx) * 180) / Math.PI

    // 랜덤 이동
    const moveDx = Math.cos(toRadians(this.aiDirection))
    const moveDy = Math.sin(toRadians(this.aiDirection))
    this.move(moveDx, moveDy, walls, otherTanks)

    // 플레이어를 향해 발사
    const dist = distance(this.x, this.y, player.x, player.y)
    if (dist < 400 && Math.random() < 0.02) {
      // 2% 확률로 발사
      return this.shoot()
    }

    return null
  }

  // 그리기
  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(toRadians(this.angle))

    // 탱크 본체
    ctx.fillStyle = this.isPlayer ? "#4ecca3" : "#ff6b6b"
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size)

    // 탱크 외곽선
    ctx.strokeStyle = this.isPlayer ? "#45b393" : "#ee5a6f"
    ctx.lineWidth = 3
    ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size)

    // 포신
    ctx.fillStyle = this.isPlayer ? "#3da88a" : "#d63447"
    ctx.fillRect(0, -5, this.size / 2 + 10, 10)

    // 탱크 중앙 표시
    ctx.fillStyle = "#2d3436"
    ctx.beginPath()
    ctx.arc(0, 0, 10, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    // HP 바 그리기
    if (!this.isPlayer) {
      const barWidth = this.size
      const barHeight = 5
      const barX = this.x - barWidth / 2
      const barY = this.y - this.size / 2 - 15

      // 배경
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.fillRect(barX, barY, barWidth, barHeight)

      // HP
      const hpPercent = this.hp / this.maxHp
      ctx.fillStyle = hpPercent > 0.5 ? "#4ecca3" : hpPercent > 0.25 ? "#ffd93d" : "#ff6b6b"
      ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight)

      // 외곽선
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 1
      ctx.strokeRect(barX, barY, barWidth, barHeight)
    }
  }
}

// ============================================
// Game 클래스 (게임 메인)
// ============================================

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas")
    this.ctx = this.canvas.getContext("2d")
    this.canvas.width = CONFIG.CANVAS_WIDTH
    this.canvas.height = CONFIG.CANVAS_HEIGHT

    // 게임 상태
    this.player = null
    this.enemies = []
    this.bullets = []
    this.walls = []
    this.particles = []
    this.score = 0
    this.level = 1
    this.isPaused = false
    this.isGameOver = false
    this.lastTime = Date.now()

    // 입력 상태
    this.keys = {}
    this.mouseX = 0
    this.mouseY = 0

    // 모바일 조이스틱
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    }

    this.init()
    this.setupEventListeners()
    this.gameLoop()
  }

  init() {
    // 플레이어 생성
    this.player = new Tank(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, true)

    // 레벨에 맞게 적과 벽 생성
    this.generateLevel()

    // UI 업데이트
    this.updateUI()
  }

  generateLevel() {
    // 적 생성 (레벨에 따라 증가)
    this.enemies = []
    const enemyCount = 3 + this.level
    for (let i = 0; i < enemyCount; i++) {
      let x, y, tooClose
      do {
        x = Math.random() * (CONFIG.CANVAS_WIDTH - 100) + 50
        y = Math.random() * (CONFIG.CANVAS_HEIGHT - 100) + 50
        tooClose = distance(x, y, this.player.x, this.player.y) < 200
      } while (tooClose)

      const enemy = new Tank(x, y, false)
      enemy.maxHp = 50 + this.level * 10
      enemy.hp = enemy.maxHp
      this.enemies.push(enemy)
    }

    // 벽 생성
    this.walls = []
    const wallCount = 15 + this.level * 2
    for (let i = 0; i < wallCount; i++) {
      const x =
        Math.floor((Math.random() * (CONFIG.CANVAS_WIDTH - CONFIG.WALL_SIZE)) / CONFIG.WALL_SIZE) * CONFIG.WALL_SIZE
      const y =
        Math.floor((Math.random() * (CONFIG.CANVAS_HEIGHT - CONFIG.WALL_SIZE)) / CONFIG.WALL_SIZE) * CONFIG.WALL_SIZE
      const type = Math.random() < 0.7 ? "brick" : "steel" // 70% 벽돌, 30% 강철
      this.walls.push(new Wall(x, y, type))
    }
  }

  setupEventListeners() {
    // 키보드 입력
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true

      // 일시정지 (P)
      if (e.key.toLowerCase() === "p") {
        this.togglePause()
      }

      // 재시작 (R)
      if (e.key.toLowerCase() === "r") {
        this.restart()
      }
    })

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false
    })

    // 마우스 입력
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect()
      this.mouseX = e.clientX - rect.left
      this.mouseY = e.clientY - rect.top
    })

    this.canvas.addEventListener("click", (e) => {
      if (this.isPaused || this.isGameOver) return

      const rect = this.canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // 마우스 방향으로 발사
      const dx = mouseX - this.player.x
      const dy = mouseY - this.player.y
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI

      const bullet = this.player.shoot(angle)
      if (bullet) {
        this.bullets.push(bullet)
      }
    })

    // 모바일 조이스틱
    const joystick = document.getElementById("joystick")
    if (joystick) {
      joystick.addEventListener("touchstart", (e) => {
        e.preventDefault()
        const touch = e.touches[0]
        const rect = joystick.getBoundingClientRect()
        this.joystick.active = true
        this.joystick.startX = rect.left + rect.width / 2
        this.joystick.startY = rect.top + rect.height / 2
        this.joystick.currentX = touch.clientX
        this.joystick.currentY = touch.clientY
      })

      joystick.addEventListener("touchmove", (e) => {
        e.preventDefault()
        if (!this.joystick.active) return
        const touch = e.touches[0]
        this.joystick.currentX = touch.clientX
        this.joystick.currentY = touch.clientY
      })

      joystick.addEventListener("touchend", (e) => {
        e.preventDefault()
        this.joystick.active = false
      })
    }

    // 모바일 발사 버튼
    const fireBtn = document.getElementById("fireBtn")
    if (fireBtn) {
      fireBtn.addEventListener("touchstart", (e) => {
        e.preventDefault()
        if (this.isPaused || this.isGameOver) return

        const bullet = this.player.shoot()
        if (bullet) {
          this.bullets.push(bullet)
        }
      })
    }

    // 재시작 버튼
    document.getElementById("restartBtn").addEventListener("click", () => {
      this.restart()
    })
  }

  togglePause() {
    if (this.isGameOver) return
    this.isPaused = !this.isPaused
    document.getElementById("pauseOverlay").classList.toggle("hidden", !this.isPaused)
  }

  restart() {
    this.score = 0
    this.level = 1
    this.isPaused = false
    this.isGameOver = false
    this.bullets = []
    this.particles = []

    document.getElementById("gameOverlay").classList.add("hidden")
    document.getElementById("pauseOverlay").classList.add("hidden")

    this.init()
  }

  gameOver() {
    this.isGameOver = true
    document.getElementById("overlayTitle").textContent = "GAME OVER"
    document.getElementById("overlayMessage").textContent = "당신의 탱크가 파괴되었습니다!"
    document.getElementById("finalScore").textContent = this.score
    document.getElementById("finalLevel").textContent = this.level
    document.getElementById("gameOverlay").classList.remove("hidden")
  }

  levelComplete() {
    this.level++
    this.score += 1000

    // 플레이어 체력 회복
    this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp)

    // 다음 레벨 생성
    this.generateLevel()
    this.updateUI()
  }

  createExplosion(x, y) {
    // 파티클 생성
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
      this.particles.push(new Particle(x, y))
    }

    // 폭발 범위 내 데미지 처리
    const damage = CONFIG.EXPLOSION_DAMAGE
    const radius = CONFIG.EXPLOSION_RADIUS

    // 플레이어 피해
    if (distance(x, y, this.player.x, this.player.y) < radius) {
      if (this.player.takeDamage(damage)) {
        this.gameOver()
      }
    }

    // 적 피해
    this.enemies = this.enemies.filter((enemy) => {
      if (distance(x, y, enemy.x, enemy.y) < radius) {
        if (enemy.takeDamage(damage)) {
          this.score += 100
          return false // 제거
        }
      }
      return true
    })

    // 벽 파괴
    this.walls = this.walls.filter((wall) => {
      const wallCenterX = wall.x + wall.width / 2
      const wallCenterY = wall.y + wall.height / 2
      if (distance(x, y, wallCenterX, wallCenterY) < radius) {
        return !wall.takeDamage(damage)
      }
      return true
    })
  }

  update(deltaTime) {
    if (this.isPaused || this.isGameOver) return

    // 플레이어 이동 (WASD)
    let dx = 0,
      dy = 0
    if (this.keys["w"]) dy -= 1
    if (this.keys["s"]) dy += 1
    if (this.keys["a"]) dx -= 1
    if (this.keys["d"]) dx += 1

    // 모바일 조이스틱 입력
    if (this.joystick.active) {
      const joyDx = this.joystick.currentX - this.joystick.startX
      const joyDy = this.joystick.currentY - this.joystick.startY
      const magnitude = Math.sqrt(joyDx * joyDx + joyDy * joyDy)

      if (magnitude > 10) {
        dx = joyDx / magnitude
        dy = joyDy / magnitude

        // 조이스틱 방향으로 탱크 회전
        this.player.angle = (Math.atan2(joyDy, joyDx) * 180) / Math.PI
      }
    }

    // 이동 정규화
    if (dx !== 0 || dy !== 0) {
      const magnitude = Math.sqrt(dx * dx + dy * dy)
      dx /= magnitude
      dy /= magnitude
      this.player.move(dx, dy, this.walls, this.enemies)
    }

    // 플레이어 회전 (마우스 방향)
    if (!this.joystick.active) {
      const dx = this.mouseX - this.player.x
      const dy = this.mouseY - this.player.y
      this.player.angle = (Math.atan2(dy, dx) * 180) / Math.PI
    }

    // 적 AI 업데이트
    for (const enemy of this.enemies) {
      const bullet = enemy.updateAI(this.player, this.walls, this.enemies, deltaTime)
      if (bullet) {
        this.bullets.push(bullet)
      }
    }

    // 총알 업데이트
    for (const bullet of this.bullets) {
      bullet.update()

      // 벽 충돌
      for (const wall of this.walls) {
        if (
          rectCollision(
            bullet.x - bullet.size,
            bullet.y - bullet.size,
            bullet.size * 2,
            bullet.size * 2,
            wall.x,
            wall.y,
            wall.width,
            wall.height,
          )
        ) {
          bullet.active = false

          // 플레이어 총알만 폭발
          if (bullet.isPlayer) {
            this.createExplosion(bullet.x, bullet.y)
          }
          break
        }
      }

      // 탱크 충돌
      if (bullet.isPlayer) {
        // 플레이어 총알 -> 적 충돌
        for (const enemy of this.enemies) {
          if (circleCollision(bullet, enemy, bullet.size, enemy.size / 2)) {
            bullet.active = false
            this.createExplosion(bullet.x, bullet.y)
            break
          }
        }
      } else {
        // 적 총알 -> 플레이어 충돌
        if (circleCollision(bullet, this.player, bullet.size, this.player.size / 2)) {
          bullet.active = false
          if (this.player.takeDamage(20)) {
            this.gameOver()
          }
        }
      }
    }

    // 비활성 총알 제거
    this.bullets = this.bullets.filter((b) => b.active)

    // 파티클 업데이트
    for (const particle of this.particles) {
      particle.update()
    }
    this.particles = this.particles.filter((p) => !p.isDead())

    // 레벨 클리어 체크
    if (this.enemies.length === 0) {
      this.levelComplete()
    }

    // UI 업데이트
    this.updateUI()
  }

  draw() {
    // 배경
    this.ctx.fillStyle = "#2d3436"
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // 그리드 그리기
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
    this.ctx.lineWidth = 1
    for (let x = 0; x < this.canvas.width; x += 40) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.canvas.height)
      this.ctx.stroke()
    }
    for (let y = 0; y < this.canvas.height; y += 40) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.canvas.width, y)
      this.ctx.stroke()
    }

    // 벽 그리기
    for (const wall of this.walls) {
      wall.draw(this.ctx)
    }

    // 총알 그리기
    for (const bullet of this.bullets) {
      bullet.draw(this.ctx)
    }

    // 파티클 그리기
    for (const particle of this.particles) {
      particle.draw(this.ctx)
    }

    // 적 그리기
    for (const enemy of this.enemies) {
      enemy.draw(this.ctx)
    }

    // 플레이어 그리기
    this.player.draw(this.ctx)

    // 조준선 그리기 (데스크톱)
    if (!this.joystick.active && window.innerWidth > 768) {
      this.ctx.strokeStyle = "rgba(78, 204, 163, 0.5)"
      this.ctx.lineWidth = 2
      this.ctx.setLineDash([5, 5])
      this.ctx.beginPath()
      this.ctx.moveTo(this.player.x, this.player.y)
      this.ctx.lineTo(this.mouseX, this.mouseY)
      this.ctx.stroke()
      this.ctx.setLineDash([])
    }
  }

  updateUI() {
    // 체력
    const hpPercent = (this.player.hp / this.player.maxHp) * 100
    document.getElementById("playerHealth").style.width = hpPercent + "%"
    document.getElementById("playerHealthText").textContent = Math.ceil(this.player.hp)

    // 점수
    document.getElementById("score").textContent = this.score

    // 레벨
    document.getElementById("level").textContent = this.level

    // 남은 적
    document.getElementById("enemiesLeft").textContent = this.enemies.length
  }

  gameLoop() {
    const now = Date.now()
    const deltaTime = now - this.lastTime
    this.lastTime = now

    this.update(deltaTime)
    this.draw()

    requestAnimationFrame(() => this.gameLoop())
  }
}

// 게임 시작
window.addEventListener("load", () => {
  new Game()
})
