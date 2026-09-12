# Ultrasonic Multilateration Math Spec (PLANNED)

Distance equation based on speed of sound ($c = 343\text{ m/s}$):
$$d_i = c \cdot \Delta t_i$$

Given 4 anchor positions $(x_i, y_i)$, position solver solves the non-linear system:
$$(x - x_i)^2 + (y - y_i)^2 = d_i^2$$
using Levenberg-Marquardt non-linear least squares optimization.
