"""One two-layer ReLU training step, using only the Python standard library."""
from math import isclose


def forward(theta, x, y):
    w1, b1, w2, b2 = theta
    z = w1 * x + b1
    h = max(0.0, z)
    prediction = w2 * h + b2
    loss = 0.5 * (prediction - y) ** 2
    return z, h, prediction, loss


def backward(theta, x, y):
    _, _, w2, _ = theta
    z, h, prediction, _ = forward(theta, x, y)
    d_prediction = prediction - y
    d_z = d_prediction * w2 * float(z > 0)
    return d_z * x, d_z, d_prediction * h, d_prediction


def central_difference(theta, x, y, epsilon=1e-6):
    derivatives = []
    for index in range(len(theta)):
        plus, minus = list(theta), list(theta)
        plus[index] += epsilon
        minus[index] -= epsilon
        derivatives.append(
            (forward(plus, x, y)[-1] - forward(minus, x, y)[-1]) / (2 * epsilon)
        )
    return tuple(derivatives)


if __name__ == "__main__":
    x, y = 2.0, 4.0
    theta = (0.5, 0.0, 2.0, 0.0)
    gradient = backward(theta, x, y)
    numeric_gradient = central_difference(theta, x, y)
    assert gradient == (-8, -4, -2, -2)
    assert all(isclose(a, n, abs_tol=1e-8) for a, n in zip(gradient, numeric_gradient))

    print("Before (z, h, prediction, loss):", forward(theta, x, y))
    print("Analytic gradient:", gradient)
    print("Central difference:", tuple(round(value, 8) for value in numeric_gradient))
    for rate, (prediction, loss) in [
        (0.025, (3.125, 0.3828125)),
        (0.05, (4.3, 0.045)),
        (0.10, (6.8, 3.92)),
    ]:
        updated = tuple(value - rate * g for value, g in zip(theta, gradient))
        out = forward(updated, x, y)
        assert isclose(out[-2], prediction) and isclose(out[-1], loss)
        print("Rate", rate, "parameters", tuple(round(v, 8) for v in updated))
        print("After (z, h, prediction, loss):", tuple(round(v, 8) for v in out))

    dead = (-0.5, 0.0, 2.0, 0.0)
    assert forward(dead, x, y) == (-1.0, 0.0, 0.0, 8.0)
    assert backward(dead, x, y)[:2] == (0, 0)
