#!/usr/bin/env python

import pty
import sys
# print sys.argv
res = pty.spawn(['bash', '-e', '-c', sys.argv[1]])
exitCode = res >> 8
killer = res - (exitCode << 8)
if killer:
    print("Killed by", killer)
sys.exit(exitCode)

# vim: et sw=4 sts=4
