Specifically the ones in the o1js and mina infrastructure.
nodejs and the browser runtimes. 

The slowest operations are multiplications that I have seen so far, involved
in the computation of curves with 256 bit fields or group elements of types of polynomials.

My thoughts are to reduce the number of multiplications, choose groups that have additional constraints
of being beautiful and meaningful in thier own right.

