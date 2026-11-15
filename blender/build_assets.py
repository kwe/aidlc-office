# AI-DLC Office: procedural asset build.
# Run:  Blender --background --factory-startup --python blender/build_assets.py [-- --preview]
# Writes blender/out/office.glb (environment + bots + humans + protos, all in one file).
#
# Conventions
#   Blender coords: x right, y BACK (away from the default camera), z up.  glTF export -> three.js (x, z, -y).
#   Characters face -y (toward the camera) so they face +z in three.js.
#   Anchors are empties named A_*; the game reads positions from them and never hard-codes the layout.
#   Characters are rigid named parts (no armatures); the game animates the parts.
import bpy, bmesh, math, sys, os, random
from math import pi, sin, cos, radians
from mathutils import Matrix, Vector, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)
PREVIEW = "--preview" in sys.argv
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
COL = scene.collection

# ------------------------------------------------------------------ materials
def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hexc(h):
    h = h.lstrip('#')
    return tuple(lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))

MATS = {}

def mat(name, color, rough=0.6, metal=0.0, emit=None, estr=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    c = hexc(color) if isinstance(color, str) else color
    b.inputs['Base Color'].default_value = (*c, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        e = hexc(emit) if isinstance(emit, str) else emit
        b.inputs['Emission Color'].default_value = (*e, 1)
        b.inputs['Emission Strength'].default_value = estr
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        for attr, val in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    m.diffuse_color = (*c, alpha)
    MATS[name] = m
    return m

# environment
mat('floor', '#141B2B', .75)
mat('slab', '#111828', .8)
mat('wall', '#2A3654', .85)
mat('trim', '#2B3856', .6)
mat('plat', '#2E3A5C', .7)
mat('wood', '#B98455', .6)
mat('wood_dark', '#6E4B33', .65)
mat('metal', '#9AA3B5', .35, .8)
mat('metal_dark', '#2A3040', .5, .45)
mat('white', '#E6E9F0', .5)
mat('paper', '#F4F1E6', .8)
mat('screen', '#05070C', .15, .2)
mat('glass', '#8FD3FF', .08, 0, alpha=.22)
mat('rug_mag', '#3B1840', .95)
mat('rug_cyan', '#12344A', .95)
mat('rug_lime', '#1E3A22', .95)
mat('rug_amber', '#40301A', .95)
mat('sofa', '#C2408F', .9)
mat('bean_teal', '#1FB5A6', .9)
mat('bean_orange', '#F0883A', .9)
mat('plant', '#2FA35A', .8)
mat('plant2', '#1F7A46', .8)
mat('pot', '#D07A52', .7)
mat('note_y', '#FFD84D', .8, emit='#FFD84D', estr=.25)
mat('note_p', '#FF7AB6', .8, emit='#FF7AB6', estr=.25)
mat('note_b', '#6CC7FF', .8, emit='#6CC7FF', estr=.25)
mat('note_g', '#8CFF6B', .8, emit='#8CFF6B', estr=.25)
mat('duck', '#FFD21F', .5)
mat('orange', '#FF8A2A', .6)
mat('crate', '#C29455', .8)
mat('pizza', '#D9B37A', .8)
mat('cat', '#3A3A44', .9)
mat('e_cyan', '#0B2A33', .4, emit='#38E1FF', estr=3.0)
mat('e_mag', '#2E0B28', .4, emit='#FF4FD8', estr=3.0)
mat('e_lime', '#12300B', .4, emit='#8CFF6B', estr=3.0)
mat('e_amber', '#33220B', .4, emit='#FFB547', estr=3.0)
mat('e_red', '#330B10', .4, emit='#FF4D5E', estr=3.0)
mat('e_violet', '#1D1638', .4, emit='#A98BFF', estr=3.0)
mat('e_white', '#FFF6E0', .4, emit='#FFE9C0', estr=2.5)
mat('e_warm', '#FFD9A0', .4, emit='#FFC873', estr=2.6)
mat('window', '#0E1E3C', .2, emit='#2B5BB8', estr=1.2)   # game retints for day / night
mat('led', '#0B3312', .4, emit='#5BF08F', estr=2.0)       # server LEDs; game turns red on alert
# dynamic one-off materials the game recolours (one material per object)
mat('m_hub', '#0B2A33', .4, emit='#38E1FF', estr=1.6)
mat('m_gate', '#33220B', .4, emit='#FFB547', estr=3.0)
mat('m_beacon', '#330B10', .3, emit='#FF4D5E', estr=.3)
mat('m_sensor', '#101622', .4, emit='#5A6784', estr=1.0)
mat('m_pod', '#12300B', .4, emit='#8CFF6B', estr=.6)
mat('m_arcade', '#1D1638', .3, emit='#A98BFF', estr=2.5)
# characters
mat('bot_shell', '#EEF1F6', .38, .05)
mat('bot_dark', '#232938', .45, .4)
mat('bot_face', '#04060A', .12, .1)
mat('accent', '#FF4FD8', .45, .1)                          # cloned + tinted per agent by the game
mat('accent_glow', '#2E0B28', .4, emit='#FF4FD8', estr=2.5)  # cloned + tinted per agent by the game
mat('cnd_core', '#DFF8FF', .2, emit='#BFF3FF', estr=1.5)
mat('storm', '#3A0A12', .5, emit='#FF2A3F', estr=2.2)
mat('storm_dark', '#16060A', .6)
mat('skin_a', '#E8B48A', .7)
mat('skin_b', '#8D5A3B', .7)
mat('skin_c', '#F2CDA8', .7)
mat('skin_d', '#C68656', .7)
mat('skin_e', '#F0C4A0', .7)
mat('hair_black', '#15131A', .7)
mat('hair_brown', '#4A2C1C', .8)
mat('hair_blonde', '#E8C56A', .7)
mat('hair_grey', '#9A9CA6', .7)
mat('hair_red', '#B5482A', .7)
mat('pants', '#232B44', .8)
mat('pants2', '#3B3F4D', .8)
mat('shoe', '#EDEFF4', .6)
for k, c in (('po', '#FF6B8A'), ('eng', '#4DA3FF'), ('pm', '#2EE6C5'), ('ops', '#FFB547'), ('sec', '#B784FF')):
    mat('role_' + k, c, .7)

# ------------------------------------------------------------------ builder
def TRS(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    return Matrix.Translation(loc) @ Euler(rot).to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1))

class B:
    """Accumulates primitives into ONE mesh object (one draw call per material)."""
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []

    def _mi(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def _add(self, t, m, M, smooth=True):
        idx = self._mi(m)
        bmesh.ops.recalc_face_normals(t, faces=t.faces[:])
        for f in t.faces:
            f.material_index = idx
            f.smooth = smooth
        t.transform(M)
        me = bpy.data.meshes.new('_t')
        t.to_mesh(me)
        t.free()
        self.bm.from_mesh(me)
        bpy.data.meshes.remove(me)
        return self

    def box(self, size, loc=(0, 0, 0), m='white', rot=(0, 0, 0), bevel=0.0, seg=2):
        t = bmesh.new()
        bmesh.ops.create_cube(t, size=1)
        bmesh.ops.scale(t, vec=size, verts=t.verts[:])
        if bevel > 0:
            b = min(bevel, min(size) * 0.45)
            bmesh.ops.bevel(t, geom=t.edges[:], offset=b, segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
        return self._add(t, m, TRS(loc, rot))

    def cyl(self, r, h, loc=(0, 0, 0), m='white', rot=(0, 0, 0), r2=None, seg=20, scale=(1, 1, 1)):
        t = bmesh.new()
        bmesh.ops.create_cone(t, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
        return self._add(t, m, TRS(loc, rot, scale))

    def sph(self, r, loc=(0, 0, 0), m='white', scale=(1, 1, 1), rot=(0, 0, 0), u=18, v=12):
        t = bmesh.new()
        bmesh.ops.create_uvsphere(t, u_segments=u, v_segments=v, radius=r)
        return self._add(t, m, TRS(loc, rot, scale))

    def ico(self, r, loc=(0, 0, 0), m='white', scale=(1, 1, 1), rot=(0, 0, 0), sub=1, smooth=False):
        t = bmesh.new()
        bmesh.ops.create_icosphere(t, subdivisions=sub, radius=r)
        return self._add(t, m, TRS(loc, rot, scale), smooth)

    def torus(self, R, r, loc=(0, 0, 0), m='white', rot=(0, 0, 0), seg=28, rseg=8, scale=(1, 1, 1)):
        t = bmesh.new()
        rings = []
        for i in range(seg):
            a = 2 * pi * i / seg
            ring = []
            for j in range(rseg):
                b = 2 * pi * j / rseg
                ring.append(t.verts.new(((R + r * cos(b)) * cos(a), (R + r * cos(b)) * sin(a), r * sin(b))))
            rings.append(ring)
        for i in range(seg):
            for j in range(rseg):
                t.faces.new((rings[i][j], rings[(i + 1) % seg][j], rings[(i + 1) % seg][(j + 1) % rseg], rings[i][(j + 1) % rseg]))
        return self._add(t, m, TRS(loc, rot, scale))

    def star(self, R, r, depth, loc=(0, 0, 0), m='white', rot=(0, 0, 0), points=5):
        """Flat star prism in the XZ plane (faces -y)."""
        t = bmesh.new()
        front, back = [], []
        for i in range(points * 2):
            a = pi / 2 + pi * i / points
            rr = R if i % 2 == 0 else r
            front.append(t.verts.new((rr * cos(a), -depth / 2, rr * sin(a))))
            back.append(t.verts.new((rr * cos(a), depth / 2, rr * sin(a))))
        cf = t.verts.new((0, -depth / 2 - depth * .4, 0))
        cb = t.verts.new((0, depth / 2 + depth * .4, 0))
        n = points * 2
        for i in range(n):
            j = (i + 1) % n
            t.faces.new((front[i], front[j], cf))
            t.faces.new((back[j], back[i], cb))
            t.faces.new((front[i], back[i], back[j], front[j]))
        return self._add(t, m, TRS(loc, rot), smooth=False)

    def done(self, parent=None, loc=(0, 0, 0), rot=(0, 0, 0), sharp=38, wn=True):
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(MATS[m])
        try:
            me.set_sharp_from_angle(angle=radians(sharp))
        except Exception as e:
            print('WARN sharp', e)
        ob = bpy.data.objects.new(self.name, me)
        COL.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = rot
        if parent is not None:
            ob.parent = parent
        if wn:
            mod = ob.modifiers.new('wn', 'WEIGHTED_NORMAL')
            mod.keep_sharp = True
        return ob

def empty(name, loc=(0, 0, 0), rotz=0.0, parent=None):
    e = bpy.data.objects.new(name, None)
    COL.objects.link(e)
    e.location = loc
    e.rotation_euler = (0, 0, rotz)
    e.empty_display_size = .3
    if parent is not None:
        e.parent = parent
    return e

def uvplane(name, w, h, loc, rot=(0, 0, 0), m='screen', parent=None, horizontal=False):
    """A quad with 0..1 UVs. Vertical (faces -y) unless horizontal (faces +z)."""
    me = bpy.data.meshes.new(name)
    if horizontal:
        vs = [(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)]
    else:
        vs = [(-w / 2, 0, -h / 2), (w / 2, 0, -h / 2), (w / 2, 0, h / 2), (-w / 2, 0, h / 2)]
    me.from_pydata(vs, [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name='UVMap')
    for i, c in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]):
        uv.data[i].uv = c
    me.materials.append(MATS[m])
    ob = bpy.data.objects.new(name, me)
    COL.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = rot
    if parent is not None:
        ob.parent = parent
    return ob

# ------------------------------------------------------------------ layout (single source of truth)
FX, FY = 17.0, 13.0                       # floor half-extents
ROOMS = {                                 # phase index -> centre
    1: (-10.4, 6.4),                      # Ideation      (back-left)
    2: (10.4, 6.4),                       # Inception     (back-right)
    3: (10.4, -6.2),                      # Construction  (front-right)
    4: (-10.4, -6.2),                     # Operation     (front-left)
}
ROOM_W, ROOM_D = 8.6, 7.0
DOCK_R = 4.7
DOCK_ANGLES = [180, 161.7, 143.3, 125, 55, 36.7, 18.3, 0, -18.3, -36.7, -55, 235, 216.7, 198.3]
ROLES = ['po', 'eng', 'pm', 'ops', 'sec']
DESK_X = [-5.0, -2.5, 0.0, 2.5, 5.0]
GATE_Y = 6.7

# ------------------------------------------------------------------ small props
def plant(E, x, y, s=1.0, z=0.0):
    E.cyl(.26 * s, .36 * s, (x, y, z + .18 * s), 'pot', r2=.32 * s, seg=12)
    for dx, dy, dz, r, mm in ((0, 0, .75, .36, 'plant'), (.18, .1, .55, .26, 'plant2'), (-.16, -.08, .6, .28, 'plant2'), (.02, -.12, 1.0, .24, 'plant')):
        E.ico(r * s, (x + dx * s, y + dy * s, z + dz * s), mm, sub=1)

def pendant(E, x, y, m='e_warm', z=3.3):
    E.cyl(.012, 5.2 - z, (x, y, (5.2 + z) / 2), 'metal_dark', seg=6)
    E.cyl(.1, .34, (x, y, z + .1), 'metal_dark', r2=.42, seg=16, rot=(pi, 0, 0))
    E.sph(.15, (x, y, z - .02), m, u=12, v=8)

def monitor(E, x, y, z, rotz=0.0, m='e_cyan', w=.62, h=.38):
    c, s = cos(rotz), sin(rotz)
    E.box((.2, .14, .02), (x, y, z + .01), 'metal_dark', rot=(0, 0, rotz))
    E.cyl(.02, .2, (x, y, z + .1), 'metal_dark', seg=8)
    E.box((w, .035, h), (x, y, z + .2 + h / 2), 'metal_dark', rot=(0, 0, rotz), bevel=.012)
    E.box((w - .05, .01, h - .05), (x + s * .02, y - c * .02, z + .2 + h / 2), m, rot=(0, 0, rotz))

def glass_wall(E, x0, y0, x1, y1, h=1.5):
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy)
    a = math.atan2(dy, dx)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    E.box((L, .08, .14), (cx, cy, .07), 'trim', rot=(0, 0, a))
    E.box((L, .05, h - .2), (cx, cy, .14 + (h - .2) / 2), 'glass', rot=(0, 0, a))
    E.box((L, .07, .06), (cx, cy, h - .03 + .07), 'trim', rot=(0, 0, a))
    for t in (0, 1):
        E.box((.08, .08, h + .07), (x0 + dx * t, y0 + dy * t, (h + .07) / 2), 'trim', rot=(0, 0, a))

def seats(pid, cx, cy, r=2.05, zrot=90):
    for i, a in enumerate((90, 25, 155, -35, 215, -90)):
        ar = radians(a)
        empty(f'A_room{pid}_seat{i}', (cx + r * cos(ar), cy + r * sin(ar) * .92, 0))
    empty(f'A_room{pid}_table', (cx, cy, 0))

# ------------------------------------------------------------------ environment
def build_env():
    E = B('env')
    # base + walls
    E.box((FX * 2 + .8, FY * 2 + .8, .6), (0, 0, -.31), 'slab', bevel=.08)
    E.box((FX * 2 + .8, .4, 5.2), (0, FY + .2, 2.6), 'wall')
    E.box((.4, FY * 2 + .4, 3.9), (-FX - .2, 0, 1.95), 'wall')
    E.box((.4, FY * 2 + .4, .9), (FX + .2, 0, .45), 'wall')
    E.box((FX * 2 + .8, .3, .3), (0, -FY - .15, .15), 'trim', bevel=.05)
    E.box((FX * 2, .12, .16), (0, FY - .03, .08), 'trim')
    E.box((.12, FY * 2, .16), (-FX + .03, 0, .08), 'trim')
    # clerestory windows along the back wall (either side of the mission board)
    for sx in (-1, 1):
        for i in range(3):
            x = sx * (7.4 + i * 3.1)
            E.box((2.7, .1, 1.25), (x, FY - .02, 4.2), 'trim', bevel=.03)
            E.box((2.5, .08, 1.05), (x, FY - .06, 4.2), 'window')
            E.box((.06, .1, 1.05), (x, FY - .08, 4.2), 'trim')
    # windows on the left wall
    for y in (8.6, 5.4):
        E.box((.1, 2.5, 1.2), (-FX + .02, y, 2.9), 'trim', bevel=.03)
        E.box((.08, 2.3, 1.0), (-FX + .06, y, 2.9), 'window')

    # ---- hub (Conductor dais)
    E.cyl(2.5, .12, (0, 0, .06), 'metal_dark', seg=48)
    E.cyl(2.2, .1, (0, 0, .17), 'plat', seg=48)
    E.cyl(.75, .16, (0, 0, .3), 'metal_dark', r2=.5, seg=24)
    E.cyl(.42, .05, (0, 0, .4), 'e_white', seg=24)
    for a in range(0, 360, 45):
        ar = radians(a + 22.5)
        E.box((.5, .06, .02), (1.55 * cos(ar), 1.55 * sin(ar), .225), 'trim', rot=(0, 0, ar))

    # ---- agent docks (charging pads); glow rings are added by the game in each agent's colour
    for i, a in enumerate(DOCK_ANGLES):
        ar = radians(a)
        x, y = DOCK_R * cos(ar), DOCK_R * sin(ar)
        E.cyl(.5, .07, (x, y, .035), 'metal_dark', seg=20)
        E.cyl(.4, .03, (x, y, .08), 'plat', seg=20)
        bx, by = (DOCK_R + .62) * cos(ar), (DOCK_R + .62) * sin(ar)
        E.box((.1, .5, .34), (bx, by, .17), 'metal_dark', rot=(0, 0, ar), bevel=.03)
        empty(f'A_dock_{i:02d}', (x, y, 0), rotz=ar + pi)

    # ---- mezzanine: the humans' gallery under the mission board
    E.box((12.8, 3.4, .5), (0, FY - 1.7, .25), 'plat', bevel=.03)
    E.box((12.8, .6, .25), (0, FY - 3.7, .125), 'plat', bevel=.03)
    E.box((12.8, .05, .04), (0, FY - 3.42, .51), 'e_cyan')
    for i, k in enumerate(ROLES):
        x = DESK_X[i]
        y = FY - 2.5
        E.box((1.5, .7, .06), (x, y, .5 + 1.02), 'wood', bevel=.02)
        for sx in (-.66, .66):
            E.box((.07, .5, 1.0), (x + sx, y, 1.0), 'metal_dark')
        E.box((.4, .28, .02), (x - .2, y + .1, 1.56), 'metal', bevel=.006)                     # laptop (low, so faces stay visible)
        E.box((.4, .02, .26), (x - .2, y - .05, 1.68), 'metal', rot=(radians(18), 0, 0), bevel=.006)
        E.box((.36, .006, .22), (x - .2, y - .037, 1.68), 'e_white', rot=(radians(18), 0, 0))
        E.cyl(.045, .1, (x + .55, y - .1, 1.6), 'white', seg=10)
        empty(f'A_desk_{k}', (x, y + .85, .5), rotz=pi)
        empty(f'A_desk_{k}_out', (x + 1.25, y + .85, .5))
    # mission board frame (the game draws the screen)
    E.box((10.4, .14, 2.3), (0, FY - .08, 3.45), 'metal_dark', bevel=.04)
    uvplane('scr_board', 10.0, 1.9, (0, FY - .17, 3.45))

    # ---- approval gate
    for sx in (-1.9, 1.9):
        E.box((.34, .34, 2.7), (sx, GATE_Y, 1.35), 'metal_dark', bevel=.05)
        E.box((.5, .5, .12), (sx, GATE_Y, .06), 'trim', bevel=.03)
    E.box((4.2, .4, .4), (0, GATE_Y, 2.85), 'metal_dark', bevel=.06)
    E.box((.9, .6, 1.02), (0, GATE_Y + .75, .51), 'metal_dark', bevel=.06)
    E.box((.8, .5, .05), (0, GATE_Y + .72, 1.05), 'trim', rot=(radians(-18), 0, 0))
    gl = B('gate_light')
    gl.box((3.5, .12, .12), (0, 0, 0), 'm_gate', bevel=.03)
    gl.box((.1, .12, 2.0), (-1.9, -.2, -1.4), 'm_gate', bevel=.03)
    gl.box((.1, .12, 2.0), (1.9, -.2, -1.4), 'm_gate', bevel=.03)
    gl.cyl(.15, .07, (0, .75 + .02, -2.62 + 1.0), 'm_gate', seg=16)
    gl.done(loc=(0, GATE_Y, 2.6))
    arm = B('gate_arm')
    arm.box((3.4, .1, .14), (1.7, 0, 0), 'white', bevel=.03)
    for i in range(4):
        arm.box((.36, .105, .145), (.55 + i * .82, 0, 0), 'e_red')
    arm.cyl(.13, .2, (0, 0, 0), 'metal_dark', rot=(pi / 2, 0, 0), seg=12)
    arm.done(loc=(-1.72, GATE_Y - .22, 1.05))
    empty('A_gate', (0, GATE_Y, 1.4))
    empty('A_gate_stand', (0, GATE_Y + 1.45, 0), rotz=pi)
    empty('A_plat_edge', (0, FY - 3.9, 0))

    # ---- record vault on the left wall (the game fills the shelves with binders)
    vx = -FX + .3
    E.box((.12, 5.0, 3.3), (vx - .2, .2, 1.75), 'metal_dark')
    for z in (.1, .7, 1.3, 1.9, 2.5, 3.1):
        E.box((.62, 5.0, .06), (vx + .06, .2, z + .1), 'trim')
    for y in (-2.3, 2.7):
        E.box((.62, .08, 3.3), (vx + .06, y, 1.75), 'metal_dark')
    E.box((.3, 5.2, .08), (vx - .05, .2, 3.46), 'e_violet')
    empty('A_vault', (vx + .1, .2, .23))
    empty('A_vault_in', (vx + 1.2, .2, 1.6))
    uvplane('scr_vault', 3.4, .5, (vx - .1, .2, 3.8), rot=(0, 0, pi / 2))

    # ---- ROOM 1: Ideation lounge (back-left)
    cx, cy = ROOMS[1]
    E.cyl(3.3, .03, (cx, cy, .015), 'rug_mag', seg=40)
    E.cyl(1.05, .1, (cx, cy, .5), 'wood', seg=28)
    E.cyl(.18, .46, (cx, cy, .23), 'metal_dark', seg=12)
    E.torus(1.05, .03, (cx, cy, .5), 'e_mag', seg=36)
    for i in range(7):
        a = random.uniform(0, 2 * pi)
        r = random.uniform(.2, .8)
        E.box((.2, .2, .012), (cx + r * cos(a), cy + r * sin(a), .556), random.choice(['note_y', 'note_p', 'note_b', 'note_g']), rot=(0, 0, random.uniform(0, pi)))
    # sofa on the left wall
    sx = -FX + .75
    E.box((1.0, 3.2, .42), (sx, cy - .2, .3), 'sofa', bevel=.1)
    E.box((.32, 3.2, .95), (sx - .4, cy - .2, .55), 'sofa', bevel=.1)
    for dy in (-1.72, 1.72):
        E.box((1.0, .3, .68), (sx, cy - .2 + dy, .42), 'sofa', bevel=.09)
    # office cat asleep on the sofa
    E.sph(.19, (sx + .05, cy + .7, .64), 'cat', scale=(1.25, 1, .7))
    E.sph(.12, (sx + .22, cy + .88, .68), 'cat')
    for ex in (-.06, .06):
        E.cyl(.04, .09, (sx + .22 + ex, cy + .9, .8), 'cat', r2=0, seg=6)
    E.torus(.14, .03, (sx - .1, cy + .58, .6), 'cat', seg=12, rseg=6)
    # beanbags
    E.sph(.6, (cx - 1.9, cy + 2.8, .36), 'bean_teal', scale=(1, 1, .68))
    E.sph(.55, (cx + 2.9, cy + 2.6, .34), 'bean_orange', scale=(1, 1, .68))
    # whiteboard with sticky notes on the back wall
    E.box((4.4, .1, 1.9), (cx, FY - .06, 2.0), 'metal', bevel=.03)
    E.box((4.2, .06, 1.7), (cx, FY - .1, 2.0), 'white')
    for i in range(22):
        E.box((.24, .02, .24), (cx + random.uniform(-1.9, 1.9), FY - .14, 2.0 + random.uniform(-.68, .68)), random.choice(['note_y', 'note_p', 'note_b', 'note_g']), rot=(0, random.uniform(-.15, .15), 0))
    # floor lamp + plants
    E.cyl(.2, .04, (-FX + .9, FY - 1.3, .02), 'metal_dark', seg=14)
    E.cyl(.02, 1.7, (-FX + .9, FY - 1.3, .85), 'metal_dark', seg=8)
    E.cyl(.16, .4, (-FX + .9, FY - 1.3, 1.85), 'e_warm', r2=.28, seg=16)
    plant(E, cx + 3.9, FY - 1.2, 1.25)
    plant(E, -FX + 1.0, cy - 3.0, 1.0)
    pendant(E, cx, cy, 'e_warm', 3.2)
    seats(1, cx, cy)
    empty('A_room1_rev', (cx + 3.4, cy - 2.6, 0))

    # ---- ROOM 2: Inception studio (back-right)
    cx, cy = ROOMS[2]
    E.box((7.4, 5.6, .03), (cx, cy, .015), 'rug_cyan', bevel=.01)
    E.box((3.3, 1.7, .08), (cx, cy, .92), 'wood', bevel=.03)
    for sx2 in (-1.4, 1.4):
        for sy2 in (-.65, .65):
            E.box((.09, .09, .9), (cx + sx2, cy + sy2, .45), 'metal_dark')
    E.box((2.6, 1.25, .015), (cx, cy, .968), 'e_cyan')          # blueprint
    E.box((2.5, 1.15, .016), (cx, cy, .97), 'rug_cyan')
    for i in range(6):
        E.box((2.5, .012, .017), (cx, cy - .5 + i * .2, .971), 'e_cyan')
    for i in range(11):
        E.box((.012, 1.15, .017), (cx - 1.2 + i * .24, cy, .971), 'e_cyan')
    for i, (ux, uy, mm) in enumerate(((-.8, .2, 'note_y'), (-.3, -.25, 'note_b'), (.35, .15, 'note_g'), (.9, -.2, 'note_p'))):
        E.box((.26, .26, .2), (cx + ux, cy + uy, 1.08), mm, bevel=.03)        # units of work
    E.cyl(.045, 1.1, (cx + 1.35, cy + .6, 1.02), 'paper', rot=(0, pi / 2, .5), seg=10)
    # kanban board on the back wall
    E.box((4.6, .1, 1.9), (cx, FY - .06, 2.0), 'metal', bevel=.03)
    E.box((4.4, .06, 1.7), (cx, FY - .1, 2.0), 'slab')
    for c in range(4):
        E.box((.02, .07, 1.6), (cx - 1.65 + c * 1.1 + .5, FY - .13, 2.0), 'trim')
        for r in range(random.randint(2, 4)):
            E.box((.8, .02, .22), (cx - 1.65 + c * 1.1, FY - .14, 2.62 - r * .3), ['note_b', 'note_y', 'note_g', 'note_p'][c])
    # blueprint shelf on the right
    E.box((.5, 2.0, 1.5), (FX - .5, cy + 1.8, .75), 'wood_dark', bevel=.03)
    for i in range(5):
        E.cyl(.07, .55, (FX - .62, cy + 1.1 + i * .34, 1.55 + (i % 2) * .05), 'paper', rot=(0, pi / 2, 0), seg=10)
    plant(E, cx - 3.9, FY - 1.2, 1.25)
    plant(E, FX - .9, cy - 2.8, 1.0)
    pendant(E, cx, cy, 'e_white', 3.2)
    seats(2, cx, cy, r=2.35)
    empty('A_room2_rev', (cx - 3.4, cy - 2.6, 0))

    # ---- ROOM 3: Construction bay (front-right)
    cx, cy = ROOMS[3]
    E.box((7.4, 5.6, .03), (cx - .4, cy, .015), 'rug_lime', bevel=.01)
    E.box((3.4, 1.5, .08), (cx - .4, cy, .88), 'wood_dark', bevel=.03)
    E.box((3.1, 1.2, .8), (cx - .4, cy, .42), 'metal_dark', bevel=.04)
    for i, mx in enumerate((-1.1, 0, 1.1)):
        monitor(E, cx - .4 + mx, cy + .32, .92, rotz=(i - 1) * -.22, m='e_lime')
        E.box((.4, .15, .02), (cx - .4 + mx, cy - .15, .93), 'metal_dark', bevel=.006)
    # rubber duck (every developer needs one)
    dx, dy = cx + .95, cy - .4
    E.sph(.085, (dx, dy, 1.0), 'duck', scale=(1.15, 1, .85))
    E.sph(.058, (dx - .06, dy, 1.1), 'duck')
    E.cyl(.03, .05, (dx - .125, dy, 1.095), 'orange', rot=(0, -pi / 2, 0), r2=.012, seg=8)
    # pizza box + cups
    E.box((.42, .42, .05), (cx - 1.6, cy - .3, .945), 'pizza', rot=(0, 0, .3))
    E.cyl(.045, .1, (cx - 1.0, cy - .45, .97), 'white', seg=10)
    # crates
    for (kx, ky, kz, s) in ((6.3, -11.6, .35, .7), (7.05, -11.5, .3, .6), (6.6, -11.55, .95, .5)):
        E.box((s, s, s), (kx, ky, kz), 'crate', rot=(0, 0, random.uniform(-.2, .2)), bevel=.03)
    # worktree pods along the right edge (swarm units appear here)
    for i in range(4):
        px, py = FX - 1.3, cy + 2.7 - i * 1.8
        E.cyl(.72, .08, (px, py, .04), 'metal_dark', seg=6)
        for a in range(0, 360, 120):
            ar = radians(a + 30)
            E.cyl(.03, 1.5, (px + .62 * cos(ar), py + .62 * sin(ar), .8), 'metal_dark', seg=6)
        p = B(f'pod_{i}')
        p.torus(.6, .03, (0, 0, 0), 'm_pod', seg=6, rseg=6)
        p.torus(.6, .02, (0, 0, 1.45), 'm_pod', seg=6, rseg=6)
        ob = p.done(loc=(px, py, .1))
        ob.data.materials[0] = MATS['m_pod'].copy()
        empty(f'A_pod_{i}', (px, py, 0), rotz=pi / 2)
    pendant(E, cx - .4, cy, 'e_white', 3.2)
    seats(3, cx - .4, cy, r=2.3)
    empty('A_room3_rev', (cx - 3.9, cy + 2.6, 0))

    # ---- ROOM 4: Operations centre (front-left)
    cx, cy = ROOMS[4]
    E.box((7.4, 5.6, .03), (cx + .4, cy, .015), 'rug_amber', bevel=.01)
    # curved NOC desk facing the wall screen
    for i, a in enumerate((-32, 0, 32)):
        ar = radians(a)
        ox, oy = cx + .2 - 1.9 * cos(ar) + 1.9, cy + 1.9 * sin(ar)
        E.box((.8, 1.25, .08), (ox, oy, .86), 'wood_dark', rot=(0, 0, -ar), bevel=.03)
        E.box((.7, 1.1, .82), (ox, oy, .41), 'metal_dark', rot=(0, 0, -ar), bevel=.04)
        monitor(E, ox - .18 * cos(ar), oy + .18 * sin(ar), .9, rotz=pi / 2 - ar + pi, m='e_amber', w=.7, h=.4)
    # toy rocket on the desk: Pipeline & Deploy ships from here
    rx, ry = cx + .55, cy + .1
    E.cyl(.05, .2, (rx, ry, 1.02), 'white', seg=10)
    E.cyl(.05, .09, (rx, ry, 1.165), 'e_red', r2=0, seg=10)
    for a in (0, 120, 240):
        E.box((.07, .012, .07), (rx + .05 * cos(radians(a)), ry + .05 * sin(radians(a)), .95), 'e_red', rot=(0, 0, radians(a)))
    # wall screen frame (the game draws live charts)
    E.box((.14, 5.2, 2.3), (-FX + .08, cy + .6, 2.3), 'metal_dark', bevel=.04)
    uvplane('scr_noc', 4.9, 2.0, (-FX + .17, cy + .6, 2.3), rot=(0, 0, pi / 2))
    # server racks in the front-left corner
    for i in range(4):
        ry2 = -FY + .75 + i * 1.02
        E.box((.95, .92, 2.2), (-FX + .65, ry2, 1.1), 'metal_dark', bevel=.03)
        E.box((.02, .8, 2.0), (-FX + 1.13, ry2, 1.12), 'screen')
    leds = B('rack_leds')
    for i in range(4):
        ry2 = -FY + .75 + i * 1.02
        for r in range(9):
            for c in range(3):
                if random.random() < .8:
                    leds.box((.02, .05, .022), (-FX + 1.15, ry2 - .25 + c * .25, .32 + r * .21), 'led')
    leds.done(wn=False)
    # alarm beacon on a pole
    bx, by = cx + 3.6, cy + 3.0
    E.cyl(.16, .06, (bx, by, .03), 'metal_dark', seg=14)
    E.cyl(.035, 2.4, (bx, by, 1.2), 'metal_dark', seg=8)
    E.cyl(.14, .08, (bx, by, 2.44), 'metal_dark', seg=14)
    bc = B('beacon')
    bc.cyl(.12, .18, (0, 0, .09), 'm_beacon', seg=14)
    bc.sph(.12, (0, 0, .18), 'm_beacon', u=14, v=8)
    bc.done(loc=(bx, by, 2.48))
    empty('A_beacon', (bx, by, 2.7))
    empty('A_storm', (cx - 1.4, cy - .4, 3.4))
    plant(E, cx + 3.9, -FY + 1.0, 1.1)
    pendant(E, cx + .6, cy, 'e_amber', 3.4)
    seats(4, cx + .9, cy, r=2.2)
    empty('A_room4_rev', (cx + 3.9, cy + 2.2, 0))

    # ---- break area on the right (between Inception and Construction)
    kx, ky = FX - 3.6, .3
    E.box((2.4, .9, .95), (kx, ky, .475), 'wood_dark', bevel=.04)
    E.box((2.5, 1.0, .06), (kx, ky, .98), 'white', bevel=.02)
    E.box((.42, .4, .52), (kx - .7, ky + .1, 1.27), 'metal', bevel=.04)        # coffee machine
    E.box((.3, .06, .2), (kx - .7, ky - .12, 1.36), 'screen')
    E.cyl(.03, .02, (kx - .58, ky - .11, 1.15), 'e_red', rot=(pi / 2, 0, 0), seg=8)
    E.cyl(.05, .1, (kx - .7, ky - .22, 1.06), 'white', seg=10)
    for i in range(3):
        E.cyl(.05, .1, (kx + .3 + i * .16, ky + .2, 1.06), 'white', seg=10)
    E.sph(.11, (kx + .85, ky - .1, 1.1), 'orange', u=10, v=8)                 # fruit
    E.sph(.1, (kx + .98, ky + .05, 1.09), 'plant', u=10, v=8)
    for sx2 in (-.9, .1, .95):
        E.cyl(.2, .06, (kx + sx2, ky - 1.0, .68), 'sofa', seg=14)              # stools
        E.cyl(.03, .66, (kx + sx2, ky - 1.0, .33), 'metal', seg=8)
        E.cyl(.17, .03, (kx + sx2, ky - 1.0, .015), 'metal', seg=14)
    E.cyl(.2, 1.0, (FX - .7, ky + 1.9, .5), 'white', seg=14)                   # water cooler
    E.cyl(.17, .42, (FX - .7, ky + 1.9, 1.22), 'glass', seg=14)
    # arcade cabinet
    ax, ay = FX - .9, -1.6
    E.box((.9, .8, 1.5), (ax, ay, .75), 'metal_dark', bevel=.05)
    E.box((.9, .5, .5), (ax, ay + .15, 1.72), 'metal_dark', bevel=.05)
    E.box((.92, .6, .1), (ax - .05, ay - .32, 1.02), 'trim', rot=(radians(-12), 0, 0))
    ar = B('arcade_glow')
    ar.box((.7, .03, .5), (0, 0, 0), 'm_arcade', rot=(radians(-10), 0, 0))
    ar.box((.8, .03, .16), (0, .04, .52), 'm_arcade')
    ar.sph(.035, (-.2, -.2, -.38), 'e_red', u=8, v=6)
    ar.sph(.035, (.15, -.2, -.38), 'e_lime', u=8, v=6)
    ar.sph(.035, (.28, -.2, -.38), 'e_cyan', u=8, v=6)
    ar.done(loc=(ax, ay - .26, 1.45), rot=(0, 0, 0))
    plant(E, FX - .9, ky + 3.0, .9)
    empty('A_coffee', (kx - .7, ky - 1.2, 0))
    empty('A_arcade', (ax - .1, ay - 1.2, 0), rotz=0)
    empty('A_cooler', (FX - 1.6, ky + 1.9, 0))

    # ---- glass partitions (outer room edges only; rooms stay open toward the hub)
    glass_wall(E, -FX + .1, 2.7, -FX + 4.2, 2.7)
    glass_wall(E, -FX + .1, -2.4, -FX + 4.2, -2.4)
    glass_wall(E, FX - 3.4, 2.9, FX - .1, 2.9)
    glass_wall(E, 6.0, -FY + .3, 6.0, -FY + 3.2, h=1.2)
    glass_wall(E, -6.0, -FY + .3, -6.0, -FY + 3.2, h=1.2)

    env = E.done()
    uvplane('floor', FX * 2, FY * 2, (0, 0, 0), horizontal=True, m='floor')
    hub = B('hub_ring')
    hub.torus(2.36, .05, (0, 0, 0), 'm_hub', seg=64)
    hub.torus(1.0, .03, (0, 0, .06), 'm_hub', seg=40)
    hub.done(loc=(0, 0, .22))
    empty('A_hub', (0, 0, 0))
    empty('A_front', (0, -9.0, 0))
    return env

# ------------------------------------------------------------------ bots
def bot_base(key, body='egg', head='round'):
    root = empty('bot_' + key)
    bd = B(key + '_body')
    if body == 'egg':
        bd.sph(1, (0, 0, .43), 'bot_shell', scale=(.28, .25, .31)); bw = .28
    elif body == 'box':
        bd.box((.52, .4, .5), (0, 0, .43), 'bot_shell', bevel=.1, seg=3); bw = .26
    elif body == 'barrel':
        bd.cyl(.26, .4, (0, 0, .43), 'bot_shell', seg=20)
        bd.sph(.26, (0, 0, .63), 'bot_shell', scale=(1, 1, .35)); bd.sph(.26, (0, 0, .23), 'bot_shell', scale=(1, 1, .35)); bw = .26
    elif body == 'vee':
        bd.cyl(.17, .5, (0, 0, .43), 'bot_shell', r2=.3, seg=20)
        bd.sph(.3, (0, 0, .68), 'bot_shell', scale=(1, 1, .3)); bw = .29
    elif body == 'bell':
        bd.cyl(.31, .5, (0, 0, .43), 'bot_shell', r2=.2, seg=20)
        bd.sph(.2, (0, 0, .68), 'bot_shell', scale=(1, 1, .4)); bw = .24
    elif body == 'tall':
        bd.box((.4, .32, .6), (0, 0, .42), 'bot_shell', bevel=.09, seg=3); bw = .2
    elif body == 'tank':
        bd.box((.6, .44, .42), (0, 0, .42), 'bot_shell', bevel=.08, seg=3)
        bd.box((.64, .3, .12), (0, 0, .58), 'accent', bevel=.04); bw = .3
    # belt + chest light + thruster
    bd.torus(bw * .93, .028, (0, 0, .3), 'accent', seg=24, rseg=6, scale=(1, .9 if body in ('egg',) else .8 if body in ('box', 'tall', 'tank') else 1, 1))
    bd.cyl(.07, .03, (0, -(.25 if body in ('egg', 'barrel', 'vee', 'bell') else .2 if body != 'tank' else .22), .5), 'accent_glow', rot=(pi / 2, 0, 0), seg=14)
    bd.cyl(.17, .14, (0, 0, .12), 'bot_dark', r2=.09, seg=16, rot=(pi, 0, 0))
    bd.cyl(.075, .03, (0, 0, .045), 'accent_glow', seg=14)
    bd.done(parent=root)

    hd = B(key + '_head')
    hd.cyl(.07, .1, (0, 0, -.02), 'bot_dark', seg=12)
    if head == 'round':
        hd.sph(1, (0, 0, .2), 'bot_shell', scale=(.25, .225, .21)); fy = .2; hw = .25; top = .41
    elif head == 'box':
        hd.box((.46, .36, .34), (0, 0, .2), 'bot_shell', bevel=.08, seg=3); fy = .175; hw = .23; top = .37
    elif head == 'dome':
        hd.cyl(.23, .2, (0, 0, .13), 'bot_shell', seg=22)
        hd.sph(.23, (0, 0, .23), 'bot_shell', scale=(1, 1, .75)); fy = .215; hw = .23; top = .4
    elif head == 'wide':
        hd.box((.56, .32, .28), (0, 0, .18), 'bot_shell', bevel=.09, seg=3); fy = .155; hw = .28; top = .32
    elif head == 'tv':
        hd.box((.48, .3, .38), (0, 0, .22), 'bot_shell', bevel=.05, seg=3); fy = .145; hw = .24; top = .41
    elif head == 'capsule':
        hd.cyl(.17, .26, (0, 0, .2), 'bot_shell', rot=(0, pi / 2, 0), seg=20)
        hd.sph(.17, (-.13, 0, .2), 'bot_shell'); hd.sph(.17, (.13, 0, .2), 'bot_shell'); fy = .15; hw = .3; top = .37
    fw, fh = (.34, .2) if head not in ('wide', 'capsule') else (.4, .18)
    hd.box((fw + .05, .09, fh + .05), (0, -fy + .035, .2), 'bot_face', bevel=.03)
    for sx in (-1, 1):
        hd.cyl(.05, .05, (sx * (hw + .005), 0, .2), 'accent', rot=(0, pi / 2, 0), seg=12)
    head_ob = hd.done(parent=root, loc=(0, 0, .74))
    uvplane(key + '_face', fw, fh, (0, -fy - .012, .2), m='bot_face', parent=head_ob)

    arms = []
    for side, sx in (('L', -1), ('R', 1)):
        a = B(key + '_arm' + side)
        a.sph(.065, (0, 0, 0), 'accent', u=12, v=8)
        a.cyl(.042, .25, (0, 0, -.15), 'bot_shell', seg=10)
        a.sph(.066, (0, 0, -.3), 'bot_dark', u=12, v=8)
        arms.append(a.done(parent=root, loc=(sx * (bw + .075), 0, .57)))
    return root, head_ob, arms, top

def acc(key, parent, loc=(0, 0, 0)):
    return B(key + '_acc')

def build_bots():
    bots = {}
    # PRD Product: lightbulb (ideas)
    r, h, arms, top = bot_base('PRD', 'egg', 'round')
    a = B('PRD_acc'); a.cyl(.015, .1, (0, 0, .05), 'bot_dark', seg=6)
    a.sph(.085, (0, 0, .2), 'accent_glow', u=12, v=10); a.cyl(.05, .07, (0, 0, .115), 'metal', seg=10)
    a.done(parent=h, loc=(0, 0, top))
    # ARC Architect: hard hat + rolled blueprint
    r, h, arms, top = bot_base('ARC', 'box', 'box')
    a = B('ARC_acc'); a.sph(.25, (0, 0, -.03), 'accent', scale=(1, .9, .55)); a.cyl(.29, .025, (0, -.04, -.03), 'accent', seg=20, scale=(1, 1.05, 1)); a.box((.06, .3, .05), (0, 0, .09), 'accent', bevel=.02)
    a.done(parent=h, loc=(0, 0, top))
    a = B('ARC_acc2'); a.cyl(.05, .5, (0, 0, 0), 'paper', rot=(0, radians(70), 0), seg=10); a.torus(.052, .012, (0, 0, 0), 'accent', rot=(0, radians(70) + pi / 2, 0), seg=10, rseg=5)
    a.done(parent=r, loc=(0, .24, .5))
    # DSN Design: beret + pencil
    r, h, arms, top = bot_base('DSN', 'bell', 'round')
    a = B('DSN_acc'); a.sph(.24, (.03, 0, -.02), 'accent', scale=(1.05, 1, .32), rot=(0, radians(-10), 0)); a.sph(.03, (.03, 0, .06), 'accent', u=8, v=6)
    a.done(parent=h, loc=(0, 0, top))
    a = B('DSN_acc2'); a.cyl(.022, .3, (0, 0, 0), 'note_y', seg=6); a.cyl(.022, .06, (0, 0, .18), 'wood', r2=.002, seg=6); a.cyl(.023, .04, (0, 0, -.17), 'note_p', seg=6)
    a.done(parent=arms[1], loc=(0, -.03, -.36), rot=(radians(25), 0, 0))
    # DEV Developer: headphones + laptop
    r, h, arms, top = bot_base('DEV', 'box', 'tv')
    a = B('DEV_acc'); a.torus(.27, .025, (0, 0, -.2), 'bot_dark', rot=(pi / 2, 0, 0), seg=20, rseg=6, scale=(1, 1, 1))
    for sx in (-1, 1):
        a.cyl(.09, .08, (sx * .275, 0, -.2), 'accent', rot=(0, pi / 2, 0), seg=14)
    a.done(parent=h, loc=(0, 0, top))
    a = B('DEV_acc2'); a.box((.34, .24, .02), (0, 0, 0), 'metal', bevel=.006); a.box((.34, .02, .22), (0, .12, .11), 'metal', rot=(radians(-15), 0, 0), bevel=.006); a.box((.3, .005, .18), (0, .105, .11), 'accent_glow', rot=(radians(-15), 0, 0))
    a.done(parent=r, loc=(0, -.33, .42), rot=(radians(-8), 0, 0))
    # QA Quality: magnifying glass
    r, h, arms, top = bot_base('QA', 'barrel', 'dome')
    a = B('QA_acc'); a.torus(.13, .022, (0, 0, .2), 'accent', rot=(pi / 2, 0, 0), seg=18, rseg=6); a.cyl(.125, .01, (0, 0, .2), 'glass', rot=(pi / 2, 0, 0), seg=18); a.cyl(.022, .18, (0, 0, 0), 'bot_dark', seg=8)
    a.done(parent=arms[1], loc=(0, -.04, -.34), rot=(radians(35), 0, 0))
    a = B('QA_acc2'); a.cyl(.012, .14, (0, 0, .07), 'bot_dark', seg=6); a.sph(.04, (0, 0, .16), 'accent_glow', u=8, v=6)
    a.done(parent=h, loc=(0, 0, top))
    # DSO DevSecOps: helmet crest + shield
    r, h, arms, top = bot_base('DSO', 'tank', 'box')
    a = B('DSO_acc'); a.box((.07, .4, .1), (0, 0, .02), 'accent', bevel=.03); a.box((.5, .06, .06), (0, -.19, -.05), 'accent', bevel=.02)
    a.done(parent=h, loc=(0, 0, top))
    a = B('DSO_acc2'); a.cyl(.2, .04, (0, 0, 0), 'accent', rot=(pi / 2, 0, 0), seg=6, scale=(1, 1, 1.15)); a.cyl(.12, .05, (0, -.005, 0), 'bot_shell', rot=(pi / 2, 0, 0), seg=6, scale=(1, 1, 1.15)); a.box((.04, .06, .16), (0, -.01, 0), 'accent_glow'); a.box((.12, .06, .04), (0, -.01, .02), 'accent_glow')
    a.done(parent=arms[0], loc=(-.04, -.1, -.26))
    # PIP Pipeline & Deploy: rocket backpack
    r, h, arms, top = bot_base('PIP', 'vee', 'capsule')
    a = B('PIP_acc')
    for sx in (-.11, .11):
        a.cyl(.075, .34, (sx, 0, 0), 'bot_shell', seg=12); a.cyl(.075, .13, (sx, 0, .235), 'accent', r2=0, seg=12); a.cyl(.05, .07, (sx, 0, -.2), 'bot_dark', r2=.075, seg=12); a.cyl(.04, .02, (sx, 0, -.24), 'accent_glow', seg=10)
    a.done(parent=r, loc=(0, .3, .5))
    a = B('PIP_acc2'); a.cyl(.012, .12, (0, 0, .06), 'bot_dark', seg=6); a.box((.14, .02, .09), (.07, 0, .12), 'accent')
    a.done(parent=h, loc=(0, 0, top))
    # AWS Platform: a cloud floating over its head
    r, h, arms, top = bot_base('AWS', 'box', 'wide')
    a = B('AWS_acc')
    for (x, z, rr) in ((-.15, 0, .1), (0, .05, .14), (.16, 0, .11), (.02, -.03, .1)):
        a.sph(rr, (x, 0, z), 'bot_shell', u=12, v=8)
    a.box((.36, .16, .06), (0, 0, -.07), 'bot_shell', bevel=.03)
    a.sph(.03, (0, -.11, 0), 'accent_glow', u=8, v=6)
    a.done(parent=h, loc=(0, 0, top + .2))
    # OPS Operations: siren beacon + headset mic
    r, h, arms, top = bot_base('OPS', 'barrel', 'round')
    a = B('OPS_acc'); a.cyl(.09, .04, (0, 0, .0), 'bot_dark', seg=12); a.cyl(.075, .09, (0, 0, .06), 'accent_glow', seg=12); a.sph(.075, (0, 0, .105), 'accent_glow', u=12, v=8)
    a.done(parent=h, loc=(0, 0, top - .01))
    a = B('OPS_acc2'); a.cyl(.012, .2, (0, -.1, 0), 'bot_dark', rot=(pi / 2, 0, 0), seg=6); a.sph(.03, (0, -.21, 0), 'accent', u=8, v=6)
    a.done(parent=h, loc=(.26, 0, .13), rot=(0, 0, radians(-28)))
    # DLV Delivery: cap + clipboard
    r, h, arms, top = bot_base('DLV', 'tall', 'round')
    a = B('DLV_acc'); a.sph(.245, (0, 0, -.08), 'accent', scale=(1, .95, .55)); a.box((.34, .2, .03), (0, -.24, -.08), 'accent', bevel=.012)
    a.done(parent=h, loc=(0, 0, top))
    a = B('DLV_acc2'); a.box((.22, .02, .3), (0, 0, 0), 'wood', bevel=.008); a.box((.18, .01, .24), (0, -.012, -.01), 'paper'); a.box((.1, .03, .04), (0, -.01, .14), 'metal')
    for i in range(3):
        a.box((.12, .012, .015), (0, -.018, .05 - i * .06), 'accent')
    a.done(parent=arms[0], loc=(0, -.09, -.3), rot=(radians(-20), 0, 0))
    # CMP Compliance: scales of justice
    r, h, arms, top = bot_base('CMP', 'bell', 'box')
    a = B('CMP_acc'); a.cyl(.014, .22, (0, 0, .11), 'metal', seg=6); a.box((.4, .02, .02), (0, 0, .22), 'metal')
    for sx in (-.19, .19):
        a.cyl(.006, .09, (sx, 0, .17), 'metal', seg=4); a.cyl(.07, .02, (sx, 0, .12), 'accent', r2=.04, seg=12, rot=(pi, 0, 0))
    a.sph(.025, (0, 0, .24), 'accent_glow', u=8, v=6)
    a.done(parent=h, loc=(0, 0, top))
    # ARV Architecture Reviewer: monocle + red pen
    r, h, arms, top = bot_base('ARV', 'tall', 'dome')
    a = B('ARV_acc'); a.torus(.075, .014, (0, 0, 0), 'accent', rot=(pi / 2, 0, 0), seg=16, rseg=5); a.cyl(.004, .2, (.075, 0, -.1), 'accent', seg=4)
    a.done(parent=h, loc=(.09, -.235, .23))
    a = B('ARV_acc2'); a.cyl(.02, .26, (0, 0, 0), 'accent', seg=6); a.cyl(.02, .05, (0, 0, -.155), 'bot_dark', r2=.002, seg=6)
    a.done(parent=arms[1], loc=(0, -.03, -.36), rot=(radians(160), 0, 0))
    # PLR Product Lead: star
    r, h, arms, top = bot_base('PLR', 'egg', 'box')
    a = B('PLR_acc'); a.cyl(.012, .1, (0, 0, .05), 'bot_dark', seg=6); a.star(.13, .06, .04, (0, 0, .2), 'accent_glow')
    a.done(parent=h, loc=(0, 0, top))
    # CPS Composer: music note + baton
    r, h, arms, top = bot_base('CPS', 'vee', 'tv')
    a = B('CPS_acc'); a.cyl(.012, .26, (.05, 0, .16), 'accent', seg=6); a.sph(.06, (0, 0, .04), 'accent_glow', scale=(1.2, .7, .85), rot=(0, radians(20), 0), u=10, v=8); a.box((.14, .02, .05), (.11, 0, .27), 'accent', rot=(0, radians(20), 0))
    a.done(parent=h, loc=(0, 0, top))
    a = B('CPS_acc2'); a.cyl(.01, .34, (0, 0, .1), 'paper', r2=.004, seg=6); a.sph(.022, (0, 0, -.07), 'wood', u=8, v=6)
    a.done(parent=arms[1], loc=(0, -.04, -.32), rot=(radians(50), 0, 0))

    # Conductor: core + three rings (the game spins them)
    root = empty('bot_CND')
    c = B('CND_core'); c.ico(.3, (0, 0, 0), 'cnd_core', sub=2, smooth=False); c.done(parent=root, wn=False)
    for i, (R, m) in enumerate(((.5, 'e_cyan'), (.64, 'e_mag'), (.78, 'e_amber'))):
        t = B(f'CND_ring{i + 1}'); t.torus(R, .024, (0, 0, 0), m, seg=48, rseg=6); t.done(parent=root, wn=False)
    uvplane('CND_face', .34, .2, (0, -.31, 0), m='bot_face', parent=root).hide_render = True

def build_humans():
    specs = {
        'po': dict(skin='skin_d', hair='hair_black', style='long', pants='pants'),
        'eng': dict(skin='skin_b', hair='hair_black', style='flat', pants='pants2', glasses=True),
        'pm': dict(skin='skin_a', hair='hair_brown', style='curly', pants='pants'),
        'ops': dict(skin='skin_c', hair='hair_blonde', style='pony', pants='pants2', headset=True),
        'sec': dict(skin='skin_e', hair='hair_grey', style='beanie', pants='pants', beard=True),
    }
    for k, s in specs.items():
        role = 'role_' + k
        root = empty('hum_' + k)
        t = B(k + '_torso')
        t.box((.42, .27, .5), (0, 0, .27), role, bevel=.1, seg=3)
        t.box((.36, .25, .12), (0, 0, .03), s['pants'], bevel=.04)
        t.box((.09, .02, .12), (.09, -.14, .26), 'white', bevel=.006)          # badge
        t.box((.012, .012, .2), (.09, -.135, .4), 'bot_dark')
        t.done(parent=root, loc=(0, 0, .66))
        hd = B(k + '_head')
        hd.cyl(.07, .1, (0, 0, -.01), s['skin'], seg=10)
        hd.sph(.235, (0, 0, .22), s['skin'], scale=(1, .96, 1))
        for sx in (-.085, .085):
            hd.sph(.03, (sx, -.2, .24), 'hair_black', u=8, v=6)
        hd.sph(.03, (0, -.225, .17), s['skin'], u=8, v=6)                        # nose
        hair = s['hair']
        if s['style'] == 'long':
            hd.sph(.255, (0, .03, .27), hair, scale=(1, 1, .85)); hd.box((.46, .2, .42), (0, .13, .08), hair, bevel=.09, seg=3)
        elif s['style'] == 'flat':
            hd.box((.44, .42, .16), (0, .02, .42), hair, bevel=.05); hd.box((.45, .2, .2), (0, .14, .28), hair, bevel=.05)
        elif s['style'] == 'curly':
            for (x, y, z, r) in ((0, .02, .44, .19), (-.17, .03, .36, .15), (.17, .03, .36, .15), (0, .17, .32, .17), (-.12, -.08, .44, .12), (.12, -.08, .44, .12)):
                hd.ico(r, (x, y, z), hair, sub=1)
        elif s['style'] == 'pony':
            hd.sph(.25, (0, .03, .28), hair, scale=(1, 1, .8)); hd.sph(.1, (0, .27, .34), hair); hd.sph(.085, (0, .33, .2), hair, scale=(1, 1, 1.5))
        elif s['style'] == 'beanie':
            hd.sph(.25, (0, .01, .3), role, scale=(1, 1, .8)); hd.torus(.235, .04, (0, .005, .3), 'bot_dark', seg=20, rseg=6); hd.sph(.05, (0, .01, .51), 'white', u=8, v=6)
        if s.get('glasses'):
            for sx in (-.085, .085):
                hd.torus(.055, .011, (sx, -.215, .24), 'bot_dark', rot=(pi / 2, 0, 0), seg=14, rseg=5)
            hd.box((.06, .012, .012), (0, -.225, .245), 'bot_dark')
        if s.get('beard'):
            hd.sph(.2, (0, -.05, .1), hair, scale=(1, .9, .7))
        if s.get('headset'):
            hd.torus(.25, .018, (0, .02, .25), 'bot_dark', rot=(pi / 2, 0, pi / 2), seg=18, rseg=5); hd.sph(.05, (-.24, 0, .2), 'bot_dark', u=8, v=6); hd.cyl(.01, .16, (-.2, -.1, .13), 'bot_dark', rot=(radians(60), 0, radians(25)), seg=5)
        hd.done(parent=root, loc=(0, 0, 1.2))
        for side, sx in (('L', -1), ('R', 1)):
            a = B(k + '_arm' + side)
            a.sph(.075, (0, 0, 0), role, u=10, v=8); a.cyl(.062, .24, (0, 0, -.13), role, seg=10); a.cyl(.052, .16, (0, 0, -.31), s['skin'], seg=10); a.sph(.062, (0, 0, -.41), s['skin'], u=10, v=8)
            a.done(parent=root, loc=(sx * .275, 0, 1.1))
            l = B(k + '_leg' + side)
            l.box((.16, .18, .6), (0, 0, -.3), s['pants'], bevel=.04); l.box((.17, .28, .1), (0, -.04, -.61), 'shoe', bevel=.04)
            l.done(parent=root, loc=(sx * .105, 0, .66))

def build_protos():
    # sensor pylon (the game clones one per sensor around the hub)
    root = empty('proto_sensor')
    s = B('sensor_base'); s.cyl(.17, .08, (0, 0, .04), 'metal_dark', seg=12); s.cyl(.035, .85, (0, 0, .5), 'metal_dark', seg=8); s.cyl(.1, .05, (0, 0, .93), 'metal_dark', seg=12, r2=.13)
    s.done(parent=root)
    l = B('sensor_lamp'); l.sph(.12, (0, 0, 1.08), 'm_sensor', u=12, v=8); l.torus(.17, .014, (0, 0, 1.08), 'm_sensor', seg=20, rseg=5)
    l.done(parent=root, wn=False)
    # cleaning robot
    root = empty('proto_roomba')
    r = B('roomba_body'); r.cyl(.3, .09, (0, 0, .06), 'bot_dark', seg=24); r.cyl(.24, .02, (0, 0, .115), 'bot_shell', seg=24); r.cyl(.05, .015, (0, -.12, .13), 'e_lime', seg=10); r.box((.2, .04, .03), (0, -.29, .06), 'e_cyan')
    r.done(parent=root)
    # swarm worker drone (one per parallel worktree)
    root = empty('proto_drone')
    d = B('drone_body'); d.sph(.19, (0, 0, .0), 'bot_shell', scale=(1, 1, .9)); d.box((.26, .08, .14), (0, -.14, .01), 'bot_face', bevel=.03)
    d.torus(.2, .02, (0, 0, -.06), 'accent', seg=18, rseg=5); d.cyl(.05, .03, (0, 0, -.18), 'accent_glow', seg=10); d.cyl(.012, .1, (0, 0, .22), 'bot_dark', seg=5); d.sph(.035, (0, 0, .28), 'accent_glow', u=8, v=6)
    ob = d.done(parent=root)
    uvplane('drone_face', .22, .11, (0, -.185, .01), m='bot_face', parent=ob)
    # the incident: a spiky storm core with a face (boss)
    root = empty('proto_storm')
    st = B('storm_body'); st.ico(.95, (0, 0, 0), 'storm_dark', sub=2, smooth=False)
    random.seed(11)
    for i in range(18):
        v = Vector((random.uniform(-1, 1), random.uniform(-.2, 1), random.uniform(-1, 1))).normalized()
        if v.y < -.1 and abs(v.x) < .6 and abs(v.z) < .6:
            continue
        q = Vector((0, 0, 1)).rotation_difference(v).to_euler()
        st.cyl(.2, random.uniform(.5, .9), tuple(v * 1.15), 'storm', rot=tuple(q), r2=0, seg=5)
    st.done(parent=root, wn=False)
    uvplane('storm_face', 1.2, .8, (0, -.97, .05), m='bot_face', parent=root)

# ------------------------------------------------------------------ build + export
build_env()
build_bots()
build_humans()
build_protos()

n_obj = len(bpy.data.objects)
n_tri = 0
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.data.calc_loop_triangles()
        n_tri += len(o.data.loop_triangles)
print(f'ASSETS objects={n_obj} tris={n_tri} materials={len(bpy.data.materials)}')

glb = os.path.join(OUT, 'office.glb')
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', export_apply=True, export_yup=True,
                          export_cameras=False, export_lights=False, export_animations=False,
                          export_extras=False, export_texcoords=True, export_normals=True)
print('EXPORTED', glb, os.path.getsize(glb))

# ------------------------------------------------------------------ optional preview renders
if PREVIEW:
    try:
        w = bpy.data.worlds.new('w'); scene.world = w
        try:
            w.use_nodes = True
        except Exception:
            pass
        bg = next((n for n in w.node_tree.nodes if n.type == 'BACKGROUND'), None)
        if bg:
            bg.inputs[0].default_value = (.05, .07, .12, 1); bg.inputs[1].default_value = 1.0
        sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); COL.objects.link(sun)
        sun.data.energy = 3.0; sun.rotation_euler = (radians(50), 0, radians(30))
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); COL.objects.link(cam); scene.camera = cam
        cam.data.lens = 40
        scene.render.engine = 'BLENDER_EEVEE'
        scene.render.resolution_x, scene.render.resolution_y = 1500, 950
        # line characters up for a group shot
        keys = ['PRD', 'DSN', 'DLV', 'PLR', 'CMP', 'ARC', 'ARV', 'DEV', 'QA', 'DSO', 'PIP', 'AWS', 'OPS', 'CPS']
        for i, k in enumerate(keys):
            o = bpy.data.objects['bot_' + k]; o.location = (-4.6 + (i % 7) * 1.5, -3.2 - (i // 7) * 1.6, .25)
        for i, k in enumerate(ROLES):
            bpy.data.objects['hum_' + k].location = (-3.0 + i * 1.5, -7.0, 0)
        bpy.data.objects['bot_CND'].location = (0, 0, 2.0)
        bpy.data.objects['proto_storm'].location = (-11.8, -6.6, 3.4)
        bpy.data.objects['proto_sensor'].location = (3.0, 0, 0)
        bpy.data.objects['proto_roomba'].location = (2.0, -9.5, 0)
        bpy.data.objects['proto_drone'].location = (15.7, -3.5, 1.2)

        def shot(name, loc, target):
            cam.location = loc
            d = Vector(target) - Vector(loc)
            cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
            scene.render.filepath = os.path.join(OUT, name)
            bpy.ops.render.render(write_still=True)
            print('RENDERED', name)
        shot('preview_overview.png', (16, -34, 26), (0, -1, 0))
        shot('preview_bots.png', (0, -11.5, 3.2), (0, -4.2, .9))
        shot('preview_humans.png', (0, -11.2, 1.6), (0, -7, .9))
        shot('preview_ops.png', (-2, -14, 6), (-11, -6, 1.2))
        shot('preview_back.png', (4, -6, 7), (0, 10, 1.5))
    except Exception as e:
        import traceback; traceback.print_exc()
        print('PREVIEW FAILED', e)
