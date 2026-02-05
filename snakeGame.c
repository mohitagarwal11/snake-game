#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <ctype.h>
#include <unistd.h>
#include <termios.h>
#include <fcntl.h>

#define HEIGHT (20)
#define WIDTH (30)
#define FOODS (5)

// for keeping xy dir of food and snake body
typedef struct
{
    int x, y;
} position;

// get the non conanical terminal format using this
void initTerminal()
{
    struct termios term;
    tcgetattr(0, &term);
    term.c_lflag &= ~(ICANON | ECHO);
    tcsetattr(0, TCSANOW, &term);
}

// get back the canonical terminal format
void resetTerminal()
{
    struct termios term;
    tcgetattr(0, &term);
    term.c_lflag |= ICANON | ECHO;
    tcsetattr(0, TCSANOW, &term);
}

// maybe this is for raw data input continuous
void setNonBlockingInput()
{
    int flags = fcntl(0, F_GETFL, 0);
    fcntl(0, F_SETFL, flags | O_NONBLOCK);
}
void hideCursor()
{
    printf("\e[?25l");
    fflush(stdout);
}

void showCursor()
{
    printf("\e[?25h");
    fflush(stdout);
}

// to get the food location from 1 to max-1 both inclusive
position getFood()
{
    position f;
    f.x = (1 + rand() % (HEIGHT - 1));
    f.y = (1 + rand() % (WIDTH - 1));
    return f;
}

// clear as the name suggests it is a gameover fn
void gameOver(int snakeLen)
{
    printf("\n\t\t\t  GAME OVER!\n");
    printf("\t\t\t  Score: %d\n", snakeLen - 1);
    resetTerminal();
    showCursor();
    exit(0);
}

// as the name suggests it draws or prints
void drawWindow(position snake[], position food[], int snakeLen)
{

    printf("\033[2J\033[H"); // linux/macOS clear screen

    printf("\n\tGame over on collison with self or the borders!\n");
    printf("\tUse WASD for movement and Q to exit.\n");
    printf("\tDont eat too much! xD\t\t\t\tMy HighScore-76\n");
    printf("\t\t\t\t\t\t\t~MAW11\n");

    for (int i = 0; i <= HEIGHT; i++)
    {
        for (int j = 0; j <= WIDTH; j++)
        {
            int printed = 0;

            // for borders
            if (i == 0 || j == 0 || i == HEIGHT || j == WIDTH)
            {
                printf("##");
                printed = 1;
            }
            for (int k = 0; k < snakeLen; k++)
            {
                if (snake[k].x == i && snake[k].y == j)
                {
                    printf("[]");
                    // double printing to match height and length of pixels in terminal output
                    printed = 1;
                    // self collision ke liye
                    if ((snake[k + 1].x == snake[0].x) && (snake[k + 1].y == snake[0].y))
                        gameOver(snakeLen);
                    break;
                }
            }
            // printing the food using the food array, checking this for every i j cell
            for (int l = 0; l < FOODS; l++)
            {
                if (!printed && i == food[l].x && j == food[l].y)
                {
                    printf("@@");
                    printed = 1;
                }
            }
            // if nothing printed in the cell yet then do empty cell print
            if (!printed)
                printf("  ");
        }
        printf("\n");
    }
    // printing the score at the bottom of the playable cell area
    printf("Score: %d\n\n", snakeLen - 1);
}

int main()
{
    srand(time(NULL));
    initTerminal();        // make it non canonical
    setNonBlockingInput(); // make it raw format continuous input
    hideCursor();
    int snakeLen = 1;
    position snake[HEIGHT * WIDTH];
    snake[0].x = HEIGHT / 2; // initial x of snake
    snake[0].y = WIDTH / 2;  // initial y of snake

    position food[FOODS];
    for (int i = 0; i < FOODS; i++)
    {
        food[i] = getFood(); // getting food xy for FOODS number of food
    }

    char input;
    char prevInput = 0;
    while (1)
    {
        // copy data from prev snake part to new, here other body part follows the head posi
        for (int i = snakeLen - 1; i > 0; i--)
        {
            snake[i] = snake[i - 1];
        }
        char ch;
        read(0, &ch, 1);

        if (ch == 'a' && prevInput != 'd' ||
            ch == 'd' && prevInput != 'a' ||
            ch == 'w' && prevInput != 's' ||
            ch == 's' && prevInput != 'w')
        {
            input = ch; // if the inputs are the following then only input is recorded
        }
        else if (ch == 'q')
            break;

        switch (input)
        {
        case 'w':
            snake[0].x--;
            break;
        case 's':
            snake[0].x++;
            break;
        case 'a':
            snake[0].y--;
            break;
        case 'd':
            snake[0].y++;
            break;
        }
        // border collision detection and action
        if ((snake[0].x == HEIGHT || snake[0].x == 0) || (snake[0].y == WIDTH || snake[0].y == 0))
        {
            gameOver(snakeLen);
        }
        // eating apple/food detection and action
        for (int i = 0; i < FOODS; i++)
        {
            if (snake[0].x == food[i].x && snake[0].y == food[i].y)
            {
                ++snakeLen;
                food[i] = getFood();
            }
        }

        prevInput = input;
        drawWindow(snake, food, snakeLen);
        // tells the sleep duration/gap to the code according to me
        usleep(125000); // this value is in microsecs, 100000 is 100ms or 10fps
    }
    resetTerminal();
    return 0;
}