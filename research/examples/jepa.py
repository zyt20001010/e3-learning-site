import random
random.seed(20261126)
x, y = 2.0, 3.0
theta, phi, teacher = 1.0, 0.5, 0.8
target = teacher*y
def loss(th, ph):
    return 0.5*(ph*th*x-target)**2
residual = phi*theta*x-target
grad_theta = residual*phi*x
grad_phi = residual*theta*x
h = 1e-6
fd_theta = (loss(theta+h,phi)-loss(theta-h,phi))/(2*h)
fd_phi = (loss(theta,phi+h)-loss(theta,phi-h))/(2*h)
assert abs(grad_theta-fd_theta)<1e-8
assert abs(grad_phi-fd_phi)<1e-8
assert abs(loss(theta,phi)-0.98)<1e-12
theta_new, phi_new = theta-0.1*grad_theta, phi-0.1*grad_phi
teacher_new = 0.9*teacher+0.1*theta_new
assert abs(theta_new-1.14)<1e-12 and abs(phi_new-0.78)<1e-12
assert abs(teacher_new-0.834)<1e-12
smooth_l1 = 0.5*residual**2 if abs(residual)<1 else abs(residual)-0.5
assert abs(smooth_l1-0.9)<1e-12
print(dict(context=theta*x,prediction=phi*theta*x,target=target,
           square_loss=loss(theta,phi),smooth_l1=smooth_l1,
           grad_theta=grad_theta,grad_phi=grad_phi,
           theta_new=theta_new,phi_new=phi_new,teacher_new=teacher_new))
