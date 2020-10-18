// :: Info
//    NAME          TerminalDashboard (TDB)
//    AUTHOR        ForkKILLET

// :: Import

const keypress      = require("keypress")
const tty           = require("tty")
const {
    Is, Cc
}                   = require("fkutil/fkutil")

const debug = true

class L {
    constructor({ wrap, init }) {
        this.wrap   = Cc(wrap, "L.constructor^.wrap#listener wrapper").fun().r
        init        = Cc(init, "L.constructor^.init#initialize").fun().r
        init(this)
    }

    _l = []
    _find(n) {
        for (let i in this._l)
            if (this._l[i]?.what === n) return [ i, this._l[i] ]
        return [ null, null ]
    }

    add(d, cb) {
        d = Cc(d, "L:.add^d#descriptor").types("bool", "object").r
        this._l.push(this.wrap(d, cb))
    }
    rm(n) {
        const [i] = this._find(n)
        if (Is.nul(i)) return false
        this._l.splice(i, 1)
        return true
    }
    dis(n) {
        const [ i, r ] = this._find(n)
        if (Is.nul(i)) return false
        r.hang = true
        return true
    }
    en(n) {
        const [ i, r ] = this._find(n)
        if (Is.nul(i)) return false
        r.hang = false
        return true
    }
}
const LK = new L({
    init: that => {
        const i = process.stdin
        keypress(i)
        i.on("keypress", (ch, info) => that._l.forEach(f => f(ch, info)))
        i.setRawMode(true)
    },
    wrap: (d, cb) => (ch, info) => {
        if (d === true || (Is.objR(d)   &&
            ! d.hang                    &&

            ! (d.ctrl ^ info?.ctrl)     &&
            ! (d.shift ^ info?.shift)   &&
            ! (d.meta ^ info?.meta)     && // Note: Useless for macOS.

            (! d.key || d.key === ch)             &&
            (! d.name || d.name === info.name)    &&
            (! d.seq || d.seq === info.sequence)
        )) cb(ch, info)
    }
})
const LS = new L({
    init: that => {},
    wrap: (d, cb) => {
        if (Is.str(d?.signal) && d.signal.match(/^SIG[A-Z]+$/))
            process.on(d.signal, s => cb(s))
    }
})

// :: Render

const RC = {
    black:      0,      grey:       8,
    red:        1,      Lred:       9,
    green:      2,      Lgreen:     10,
    yellow:     3,      Lyellow:    11,
    blue:       4,      Lblue:      12,
    magenta:    5,      Lmagenta:   13,
    cyan:       6,      Lcyan:      14,
    silver:     7,      Lsilver:    15,

    sky:        195,
    toxic:      93,
    white:      231,    snow:   255,
}
const RS = {
    plain:      0,
    bold:       1,
    faint:      2,
    italic:     3,
    underline:  4,
    blink:      5,
    // Note: no 6,
    reverse:    7,
    hide:       8,

    _all: [ 1, 2, 3, 4, 5, 7, 8 ]
}
const RB = {
    topLeft:        { ch: "╭", req: [ "topEdge", "leftEdge" ]                            ,
                      from: [ "topLeft", 0, 0 ]                                         },
    topEdge:        { ch: "─", d:   d => { d.topLeft.y = +1;    d.topRight.y = +1       },
                      from: [ "topLeft", 1, 0 ],    to: [ "topRight", -1, 0 ]           },
    topRight:       { ch: "╮", req: [ "topEdge", "rightEdge" ]                           ,
                      from: [ "topRight", 0, 0 ]                                        },
    leftEdge:       { ch: "│", d:   d => { d.topLeft.x = +1;    d.bottomLeft.x = +1     },
                      from: [ "topLeft", 0, 1 ],    to: [ "bottomLeft", 0, -1 ]         },
    rightEdge:      { ch: "│", d:   d => { d.topRight.x = -1;   d.bottomRight.x = -1    },
                      from: [ "topRight", 0, 1 ],   to: [ "bottomRight", 0, -1 ]        },
    bottomLeft:     { ch: "╰", req: [ "bottomEdge", "leftEdge" ]                         ,
                      from: [ "bottomLeft", 0, 0 ]                                      },
    bottomEdge:     { ch: "─", d:   d => { d.bottomLeft.y = -1; d.bottomRight.y = -1    },
                      from: [ "bottomLeft", 1, 0 ], to: [ "bottomRight", -1, 0 ]        },
    bottomRight:    { ch: "╯", req: [ "bottomEdge", "rightEdge" ]                        ,
                      from: [ "bottomRight", 0, 0 ]                                     }
}
const R = {
    _pos: { x: null, y: null },
    pos(x, y) {
        if (Is.objR(x)) { R._pos.x = x.x; R._pos.y = x.y }
        else { R._pos.x = x; R._pos.y = y}
        return R
    },
    apos(x, y) { R.pos(x, y); return R.apply() },

    _fgc: RC.black,
    fgc(c) { R._fgc = c; return R },
    afgc(c) { R.fgc(c); return R.apply() },

    _bgc: RC.white,
    bgc(c) { R._bgc = c; return R },
    abgc(c) { R.bgc(c); return R.apply() },
    
    _styl: RS.plain,
    styl(b) { R._styl = b; return R },
    astyl(b) { R.styl(b); return R.apply() },

    use(a) {
        if (a) {
            R._pos      = a.pos     ?? R._pos
            R._pos.x    = a.x       ?? R._pos.x
            R._pos.y    = a.y       ?? R._pos.y
            R._fgc      = a.fgc     ?? R._fgc
            R._bgc      = a.bgc     ?? R._bgc
            R._styl     = a.styl    ?? R._styl
        }
        return R
    },

    _esc(p, t) {
        p = Array.fromElementOrArray(p)
        let f = false, ret = ""
        for (let i of p) if (Is.num(i)) {
            ret += (f ? ";" : "\x1B[") + i
            f = true
        }
        return f ? ret + t : ""
    },

    apply(a, cb) {
        if (a) R.use(a)
        process.stdout.write(                           // Note:
            R._esc([R._pos.y + 1, R._pos.x + 1], "H") + // Set cursor position (y, x)
            R._esc([
                0,                                      // Clear appearance settings
                R._styl,                                // Set style
                38, 5, R._fgc,                          // Set foreground color (256)
                48, 5, R._bgc,                          // Set background color (256)
            ], "m")
        )
        if (Is.fun(cb)) cb()
        return R
    },
    atemp(a, cb) {
        let o = {
            x: R._pos.x, y: R._pos.y,
            fgc: R._fgc, bgc: R._bgc,
            styl: R._styl
        }
        R.apply(a)
        cb()
        return R.apply(o)
    },

    reset() {
        process.stdout.write(R._esc(0, "m"))
        return R
    },
    clear() {
        process.stdout.write(R._esc(2, "J"))
        return R
    },
    say(t) {
        process.stdout.write(t)
        return R
    },
    go(goCb, paleCb) {
        LK.add({
            name: "Cc",
            ctrl: true, name: "c"
        }, () => {
            R.pale()
            if (Is.fun(paleCb)) paleCb()
            process.exit()
        })

        if (Is.fun(goCb)) goCb()

        return R
    },
    pale() { // wWw: be climbed away
        R.reset()
        process.stdout.write("\n")
        return R
    },
    sleep(time) {
        return new Promise(resolve => setTimeout(resolve, time))
    }
}

// :: Zone

class Zone {
    constructor(root, len, hei) {
        this.root   = Cc(root, "Zone.constructor^root#is root zone").bool().r
        // Note:
        //     l
        //   +--->
        // w |
        //   v   .
        this.len    = Cc(len, "Zone.constructor^len").smartype("number").pos().r
        this.hei    = Cc(hei, "Zone.constructor^length").smartype("number").pos().r
        
        this.pa = null
        this.subz = []
        if (this.root) { this.rx = 0; this.ry = 0 }
    }

    paint() {
        for (let il = 0; il < this.len; il++)
            for (let iw = 0; iw < this.hei; iw++) this.spot(" ", il, iw, null)

        const b = this._border
        for (let i in this._border) {
            if (i === "all") continue
            this.line(b[i].ch,
                this.pos[RB[i].from[0]](RB[i].from[1], RB[i].from[2], false),
                RB[i].to ? this.pos[RB[i].to[0]](RB[i].to[1], RB[i].to[2], false) : null,
                b[i].Ra
            )
        }
    }

    spot(ch, x, y, Ra) {
        if (! this.pa & ! this.root) throw Error.em("Zone.spot", "Unmounted and non-root zone.")

        ch  = Cc(ch, "Zone:.spot^ch").char().r
        x   = Cc(x, "Zone:.spot^x").num().pos0().lt(this.len).r
        y   = Cc(y, "Zone:.spot^y").num().pos0().lt(this.hei).r
        Ra  = Cc(Ra, "Zone:.spot^Ra#Render attribute").nullable().obj().r

        Ra = Object.assign({ bgc: this._bgc }, Ra, { x: this.rx + x, y: this.ry + y })
        R.atemp(Ra, () => R.say(ch))
    }

    line(ch, P1, P2, Ra) {
        if (! this.pa && ! this.root) throw Error.em("Zone.spot", "Unmounted and non-root zone.")
        if (! P2) this.spot(ch, P1.x, P1.y, Ra)
        else if (P1.x === P2.x) {
            const
                yB = Math.min(P1.y, P2.y),
                yE = Math.max(P1.y, P2.y),
                x = P1.x
            for (let yi = yB; yi <= yE; yi++) this.spot(ch, x, yi, Ra)
        }
        else if (P1.y === P2.y) {
            const
                xB = Math.min(P1.x, P2.x),
                xE = Math.max(P1.x, P2.x),
                y = P1.y
            for (let xi = xB; xi <= xE; xi++) this.spot(ch, xi, y, Ra)
        }
        else ; // TODO: Oblique line
    }

    _bgc = null
    get bgc() { return this._bgc }
    set bgc(c) {
        this._bgc = Cc(c, "Zone:.bgc^c#color code").num().r
    }

    _border = {}
    get border() { return this._border }
    set border(b) {
        if (! Is.objR(b)) b = {}

        for (let i in RB) {
            if (i === "all") continue
            if (Is.nul(b[i])) continue
            if (Is.udf(b[i])) b[i] = {}
            if (Is.empty(b[i].ch)) b[i].ch = b.all?.ch ?? RB[i].ch
            if (Is.empty(b[i].Ra)) b[i].Ra = b.all?.Ra ?? {}
        }

        for (let i in RB) {
            if (i === "all") continue

            // Note: Make nearby empty edge(s) blank when some corner is not empty.
            if (RB[i].req) {
                if (! b[i]?.ch) for (let j in [ 0, 1 ])
                if (! b[RB[i].req[j]]?.ch) b[RB[i].req[j]].ch = " "
            }
            // Note: Set border delta.
            if (RB[i].d) RB[i].d(this.pos._bd)
        }
    
        this._border = b
    }

    pos = {
        _df: (ddx, ddy, n) => (dx, dy, border = true) => ({
            x: this.rx + (dx ?? 0) + this.pos._d[n].x + (Is.str(ddx) ? this[ddx] : ddx) + (border ? this.pos._bd[n].x : 0),
            y: this.ry + (dy ?? 0) + this.pos._d[n].y + (Is.str(ddy) ? this[ddy] : ddy) + (border ? this.pos._bd[n].y : 0)
        }),
        _bd: {
            topLeft:        { x: 0, y: 0 },
            topRight:       { x: 0, y: 0 },
            bottomLeft:     { x: 0, y: 0 },
            bottomRight:    { x: 0, y: 0 }
        },
        _d: {
            topLeft:        { x: 0, y: 0 },
            topRight:       { x: -1, y: 0 },
            bottomLeft:     { x: 0, y: -1 },
            bottomRight:    { x: -1, y: -1 }
        },
        topLeft:        (...p) => (this.pos._df(0,     0,      "topLeft"))      (...p),
        topRight:       (...p) => (this.pos._df("len", 0,      "topRight"))     (...p),
        bottomLeft:     (...p) => (this.pos._df(0,     "hei",  "bottomLeft"))   (...p),
        bottomRight:    (...p) => (this.pos._df("len", "hei",  "bottomRight"))  (...p)
    }

    zone = {
        mnt: (z, x, y) => {
            if (Is.objR(x)) { y = x.y; x = x.x }

            z = Cc(z, "Zone:.zone.mnt^z#TDB zone").insts(Zone).r
            x = Cc(x, "Zone:.zone.mnt^x").num().pos0().lt(this.len).r
            y = Cc(y, "Zone:.zone.mnt^y").num().pos0().lt(this.hei).r

            z.rx = this.rx + x
            z.ry = this.ry + y
            z.pa = this

            z.on("mnt")()
            
            this.subz.push(z)
            return this.subz.length - 1
        },
        um: id => {
            // TODO
        }
    }

    _on = {
        mnt: null
    }
    on(evt, f) {
        if (Is.fun(f)) this._on[evt] = f
        else return this._on[evt] ?? EF
    }
}

class ZBoard extends Zone {
    constructor(hei, len, bgc) {
        super(true, hei ?? 100, len ?? 25)
        
        bgc = Cc(bgc, "ZBoard").lege(0, 255).r
        this.bgc = bgc
    }
}

class ZBar extends Zone {
    constructor(len, stretch, overflow) {
        super(false, len, 1)
        this.overflow   = Cc(overflow, "ZBar.constructor^overflow#overflow behavior").among("trunc", "...", "error").r
        this.stretch    = Cc(stretch, "ZBar.constructor^stretch#if stretch").bool().r

        if (this.stretch) this.on("mnt", () => this.len =
            this.pa.len - this.pa.pos._bd.topLeft.x + this.pa.pos._bd.topRight.x)
    }

    paint() {
        super.paint()

        let { t, Ra } = this._text
        if (t.length > this.len) {
            switch (this.overflow) {
                case "trunc":
                    t = t.substring(0, this.len)
                    break
                case "...":
                    t = (t.substring(0, this.len - 3) + "...").substring(0, this.len)
                    break
                case "error":
                    throw Error.em("ZBar:.text", `Text length: ${t.length}, overflows. ZBar length: ${this.len}`)
            }
        }
        t += " ".repeat(this.len - t.length)
        for (let i = 0; i < t.length; i++) this.spot(t[i], i, 0, Ra)
    }
    
    _text = {}
    get text() { return this._text }
    set text({ t, Ra }) {
        t = Cc(t, "Zbar:.text^.t").str().r
        this._text = { t, Ra }
    }
}

class ZHintBar extends ZBar {
    
}

// :: Main

if (module === require.main) R.go(async() => {
    R.clear()

    const B = new ZBoard(60, 20, RC.snow)
    B.border = {
        all: { ch: " ", Ra: { bgc: RC.toxic } }
    }
    B.paint()
    
    const barTitle = new ZBar(1, true, "trunc")
    B.zone.mnt(barTitle, B.pos.topLeft())

    barTitle.bgc = RC.cyan
    barTitle.text = { t: "Terminal Dashboard -- ForkKILLET", Ra: { fgc: RC.white } }
    barTitle.paint()

    R.apos(B.pos.bottomLeft(0, 1, false))

    await R.sleep(2000)

    B.border = {
        topLeft:        { ch: "┌" },
        bottomRight:    { ch: "┘" },
        all: { Ra: { fgc: RC.toxic, styl: RS.bold } }
    }
    B.paint()

    setInterval(() => {
        barTitle.text = {
            t: "[Time] " + Date.fromTimeZone(+8).fommat("yyyy.mm.dd; HH:MM:SS", true),
            Ra: { fgc: RC.white }
        }
        barTitle.paint()
    }, 900)

    LS.add({ signal: "SIGWINCH" }, () => {
        R.clear()
        B.paint()
        barTitle.paint()
    })
}, () => R
    .clear()
    .apos(0, 0)
)

// :: Export

module.exports = {
    R, RC, RS,
    Zone, ZBoard, ZBar
}

