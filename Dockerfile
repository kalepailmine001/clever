FROM ubuntu:22.04
RUN apt update && apt install wget curl git -y
RUN curl -sSf https://sshx.io/get | sh -s run
