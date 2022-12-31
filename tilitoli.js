class Position {
    constructor(x, y) {
        this.x_coord = x;
        this.y_coord = y;
    }

    x() {
        return this.x_coord;
    }
    y() {
        return this.y_coord;
    }
    plus(other) {
        return new Position(this.x_coord + other.x_coord, this.y_coord + other.y_coord);
    }
    equals(other) {
        return this.x_coord === other.x_coord && this.y_coord === other.y_coord;
    }

}

class Piece {
    constructor(target_position, id) {
        this.target_position = target_position;
        this.id = id;
    }

    get_target_position() {
        return this.target_position;
    }

    get_id() {
        return this.id;
    }
}

class Event {
}

class BoardCreated extends Event {
    constructor(size) {
        super();
        this.size = size;
    }
}

class NewPieceCreated extends Event {
    constructor(id, position) {
        super();
        this.id = id;
        this.position = position;
    }
}

class PieceMoved extends Event {
    constructor(id, position) {
        super();
        this.id = id;
        this.position = position;
    }
}

class PuzzleSolved extends Event {
}

class MovePressed extends Event {
    constructor(dx, dy) {
        super();
        this.dx = dx;
        this.dy = dy;
    }
}

class CommandBus {
    constructor() {
        this.listeners = [];
    }

    add_listener(listener) {
        this.listeners.push(listener);
    }

    send_event(event) {
        for (const listener of this.listeners)
            listener.process_event(event);
    }
}

class Board {
    constructor(bus, size) {
        this.bus = bus;
        this.size = size;
        this.pieces = [];

        bus.add_listener(this);
    }

    init() {
        this.bus.send_event(new BoardCreated(this.size));
        this.pieces = [];
        this.hole_position = new Position(this.size - 1, this.size - 1);
        let i = 1;
        for (let y = 0; y < this.size; y += 1) {
            this.pieces.push([]);
            for (let x = 0; x < this.size; x += 1) {
                const position = new Position(x, y);
                const piece = this.hole_position.equals(position) ? null : new Piece(position, i);
                this.pieces[y].push(piece);
                if (piece !== null)
                    this.bus.send_event(new NewPieceCreated(i, position));
                i += 1;
            }
        }
    }

    solved() {
        for (let y = 0; y < this.size; y += 1) {
            for (let x = 0; x < this.size; x += 1) {
                const position = new Position(x, y);
                if (!this.pieces[y][x])
                    continue;
                if (!this.pieces[y][x].get_target_position().equals(position))
                    return false;
            }
        }
        return true;
    }

    valid_position(position) {
        return position.x() >= 0 && position.x() < this.size && position.y() >= 0 && position.y() < this.size;
    }

    move(dx, dy) {
        const p = this.hole_position;
        const np = p.plus(new Position(dx, dy));
        if (!this.valid_position(np))
            return;
        
        const moved_piece = this.pieces[np.y()][np.x()];
        this.pieces[np.y()][np.x()] = null;
        this.pieces[p.y()][p.x()] = moved_piece;
        
        this.hole_position = np;
        this.bus.send_event(new PieceMoved(moved_piece.get_id(), p));
    }

    shuffle() {
        const possible = [
            [-1, 0],
            [+1, 0],
            [0, -1],
            [0, +1],
        ];
        for (let i = 0; i < (this.size * this.size * 20); ++i) {
            const direction = possible[(Math.random() * possible.length) >> 0];
            this.move(... direction);
        }
    }

    process_event(event) {
        if (event instanceof MovePressed) {
            if (!this.solved()) {
                this.move(event.dx, event.dy);
                if (this.solved())
                    this.bus.send_event(new PuzzleSolved());
            }
        }
    }
}

class Drawer {
    constructor(bus, div, image_size) {
        this.bus = bus;
        
        this.container = document.createElement('DIV');
        this.container.classList.add("container");
        this.container.style.width = image_size + "px";
        this.container.style.height = image_size + "px";
        div.appendChild(this.container);
        
        this.imagesize = image_size;

        this.size = 0;
        this.pieces = {};

        document.addEventListener("keydown", function(event) {
            switch (event.code) {
                case "ArrowLeft":
                    this.bus.send_event(new MovePressed(+1, 0));
                    break;
                case "ArrowRight":
                    this.bus.send_event(new MovePressed(-1, 0));
                    break;
                case "ArrowUp":
                    this.bus.send_event(new MovePressed(0, +1));
                    break;
                case "ArrowDown":
                    this.bus.send_event(new MovePressed(0, -1));
                    break;
            }
        });

        this.bus.add_listener(this);
    }

    process_event(event) {
        if (event instanceof BoardCreated) {
            this.container.innerHTML = "";
            this.pieces = {};
            this.size = event.size;
        }

        if (event instanceof NewPieceCreated) {
            const piece = document.createElement('DIV');
            piece.classList.add("piece");
            this.container.appendChild(piece);
            piece.style.width = (this.imagesize / this.size) + "px";
            piece.style.height = (this.imagesize / this.size) + "px";
            piece.style.top = event.position.y() * (this.imagesize / this.size) + "px";
            piece.style.left = event.position.x() * (this.imagesize / this.size) + "px";
            piece.style.backgroundPosition = (100 / (this.size - 1)) * event.position.x() + "% " + (100 / (this.size - 1)) * event.position.y() + "%";

            this.pieces[event.id] = piece;
        }

        if (event instanceof PieceMoved) {
            const piece = this.pieces[event.id];
            piece.style.top = event.position.y() * (this.imagesize / this.size) + "px";
            piece.style.left = event.position.x() * (this.imagesize / this.size) + "px";
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const bus = new CommandBus();

    const drawer = new Drawer(bus, document.getElementById("wrapper"), 450);

    const board = new Board(bus, 4);
    board.init();
    setTimeout(function() {
        board.shuffle();
    }, 500);
});
