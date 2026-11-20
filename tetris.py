import turtle
import random
import time

# 定数定義
SCREEN_WIDTH = 300
SCREEN_HEIGHT = 600
BLOCK_SIZE = 30
GRID_WIDTH = SCREEN_WIDTH // BLOCK_SIZE
GRID_HEIGHT = SCREEN_HEIGHT // BLOCK_SIZE

# 色の定義
WHITE = "white"
BLACK = "black"
COLORS = [
    "cyan", "yellow", "purple", "green", "red", "blue", "orange"
]

# テトリミノの形状
SHAPES = [
    [[1, 1, 1, 1]],  # I
    [[1, 1], [1, 1]],  # O
    [[0, 1, 0], [1, 1, 1]],  # T
    [[0, 1, 1], [1, 1, 0]],  # S
    [[1, 1, 0], [0, 1, 1]],  # Z
    [[1, 0, 0], [1, 1, 1]],  # J
    [[0, 0, 1], [1, 1, 1]]   # L
]

class Piece:
    def __init__(self, x, y, shape):
        self.x = x
        self.y = y
        self.shape = shape
        self.color = random.choice(COLORS)
        self.rotation = 0

    def get_current_shape(self):
        shape = self.shape
        for _ in range(self.rotation):
            shape = [list(row) for row in zip(*shape[::-1])]
        return shape

    def can_move(self, grid, dx, dy, new_rotation=None):
        shape = self.get_current_shape()
        if new_rotation is not None:
            temp_shape = self.shape
            for _ in range(new_rotation):
                temp_shape = [list(row) for row in zip(*temp_shape[::-1])]
            shape = temp_shape

        for r, row in enumerate(shape):
            for c, cell in enumerate(row):
                if cell:
                    new_x = self.x + c + dx
                    new_y = self.y + r + dy
                    if new_x < 0 or new_x >= GRID_WIDTH or new_y >= GRID_HEIGHT:
                        return False
                    if new_y >= 0 and grid[new_y][new_x] != 0:
                        return False
        return True


class Tetris:
    def __init__(self):
        self.grid = [[0 for _ in range(GRID_WIDTH)] for _ in range(GRID_HEIGHT)]
        self.current_piece = None
        self.game_over = False
        self.score = 0
        self.next_piece = Piece(GRID_WIDTH // 2 - 1, 0, random.choice(SHAPES))
        self.new_piece()

        self.screen = turtle.Screen()
        self.screen.title("Tetris (Turtle Version)")
        self.screen.bgcolor(BLACK)
        self.screen.setup(SCREEN_WIDTH, SCREEN_HEIGHT)
        self.screen.tracer(0)

        self.pen = turtle.Turtle()
        self.pen.hideturtle()
        self.pen.penup()

        self.score_pen = turtle.Turtle()
        self.score_pen.hideturtle()
        self.score_pen.penup()
        self.score_pen.color(WHITE)
        self.score_pen.goto(-130, -270)
        self.update_score()

        self.screen.listen()
        self.screen.onkeypress(lambda: self.move(-1, 0), "Left")
        self.screen.onkeypress(lambda: self.move(1, 0), "Right")
        self.screen.onkeypress(lambda: self.move(0, 1), "Down")
        self.screen.onkeypress(lambda: self.rotate(), "Up")

    def new_piece(self):
        self.current_piece = self.next_piece
        self.next_piece = Piece(GRID_WIDTH // 2 - 1, 0, random.choice(SHAPES))
        if not self.current_piece.can_move(self.grid, 0, 0):
            self.game_over = True

    def rotate(self):
        if self.current_piece.can_move(self.grid, 0, 0, new_rotation=self.current_piece.rotation + 1):
            self.current_piece.rotation = (self.current_piece.rotation + 1) % 4

    def move(self, dx, dy):
        if self.current_piece.can_move(self.grid, dx, dy):
            self.current_piece.x += dx
            self.current_piece.y += dy
            return True

        if dy == 1:
            self.lock_piece()
            self.clear_lines()
            self.new_piece()
        return False

    def lock_piece(self):
        shape = self.current_piece.get_current_shape()
        for r, row in enumerate(shape):
            for c, cell in enumerate(row):
                if cell:
                    if self.current_piece.y + r < 0:
                        self.game_over = True
                    elif self.current_piece.y + r >= GRID_HEIGHT:
                        self.grid[self.current_piece.y + r][self.current_piece.x + c] = self.current_piece.color
                    else:
                        self.grid[self.current_piece.y + r][self.current_piece.x + c] = self.current_piece.color

    def clear_lines(self):
        lines_to_clear = []
        for y, row in enumerate(self.grid):
            if all(cell != 0 for cell in row):
                lines_to_clear.append(y)

        for y in sorted(lines_to_clear, reverse=True):
            del self.grid[y]
            self.grid.insert(0, [0 for _ in range(GRID_WIDTH)])

        self.score += len(lines_to_clear) * 100
        self.update_score()

    def update_score(self):
        self.score_pen.clear()
        self.score_pen.write(f"Score: {self.score}", align="left", font=("Arial", 18, "normal"))

    def draw(self):
        self.pen.clear()
        # Grid drawing
        for y, row in enumerate(self.grid):
            for x, cell in enumerate(row):
                if cell != 0:
                    self.pen.pencolor(cell)
                    self.pen.goto(x * BLOCK_SIZE - SCREEN_WIDTH//2, y * BLOCK_SIZE - SCREEN_HEIGHT//2)
                    self.pen.stamp()
                    self.pen.goto(x * BLOCK_SIZE - SCREEN_WIDTH//2, y * BLOCK_SIZE - SCREEN_HEIGHT//2)
                    self.pen.setheading(0)
                    self.pen.pendown()
                    self.pen.goto((x + 1) * BLOCK_SIZE - SCREEN_WIDTH//2, y * BLOCK_SIZE - SCREEN_HEIGHT//2)
                    self.pen.penup()

        # Current piece drawing
        if self.current_piece:
            shape = self.current_piece.get_current_shape()
            for r, row in enumerate(shape):
                for c, cell in enumerate(row):
                    if cell:
                        self.pen.pencolor(self.current_piece.color)
                        self.pen.goto((self.current_piece.x + c) * BLOCK_SIZE - SCREEN_WIDTH//2,
                                       (self.current_piece.y + r) * BLOCK_SIZE - SCREEN_HEIGHT//2)
                        self.pen.stamp()

        if self.game_over:
            self.score_pen.goto(0, 0)
            self.score_pen.write("GAME OVER", align="center", font=("Arial", 30, "bold"))

        self.screen.update()

    def game_loop(self):
        if not self.game_over:
            self.draw()
            self.screen.ontimer(lambda: self.game_loop(), 500)

if __name__ == "__main__":
    game = Tetris()
    game.game_loop()
    turtle.done()
