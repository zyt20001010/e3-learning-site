# Python >= 3.9；仅标准库。确定性合成例，无随机抽样。
import random
random.seed(20261126)
x, target, w, b = 2.0, 1.0, 0.5, -0.5
def forward(w, b):
    z = w*x + b
    h = max(0.0, z)
    prediction = h*h + h   # 同一 h 经过平方和恒等两条路径
    loss = 0.5*(prediction-target)**2
    return z, h, prediction, loss
z, h, prediction, loss = forward(w, b)
dy = prediction-target
dh_square, dh_identity = dy*2*h, dy
dz = (dh_square+dh_identity)*(1.0 if z > 0 else 0.0)
dw, db = dz*x, dz
eps = 1e-6
fdw = (forward(w+eps,b)[3]-forward(w-eps,b)[3])/(2*eps)
fdb = (forward(w,b+eps)[3]-forward(w,b-eps)[3])/(2*eps)
assert abs(dw-fdw)<1e-7 and abs(db-fdb)<1e-7
assert (z,h,prediction,loss) == (0.5,0.5,0.75,0.03125)
assert (dw,db) == (-1.0,-0.5)
learning_rate = 0.02
new_w, new_b = w-learning_rate*dw, b-learning_rate*db
new_loss = forward(new_w,new_b)[3]
assert new_loss < loss
print({'z':z,'h':h,'prediction':prediction,'loss':loss})
print({'square_path':dh_square,'identity_path':dh_identity,
       'dw':dw,'db':db,'finite_difference_w':fdw})
print({'updated_w':new_w,'updated_b':new_b,'updated_loss':new_loss})
