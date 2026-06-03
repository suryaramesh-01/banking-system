provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "nexabank_vpc" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "NexaBank-VPC"
  }
}

resource "aws_subnet" "public_subnet" {
  vpc_id                  = aws_vpc.nexabank_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "Public-Subnet"
  }
}


resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.nexabank_vpc.id

  tags = {
    Name = "NexaBank-IGW"
  }
}



resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.nexabank_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }
}

resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.public_subnet.id
  route_table_id = aws_route_table.public_rt.id
}





resource "aws_security_group" "bank_sg" {
  name   = "bank-security"
  vpc_id = aws_vpc.nexabank_vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}




resource "aws_instance" "nexabank_server" {

  ami                    = "ami-0f58b397bc5c1f2e8"
  instance_type          = "t2.medium"
  subnet_id              = aws_subnet.public_subnet.id
  vpc_security_group_ids = [aws_security_group.bank_sg.id]
  key_name               = "nexabank-key"

  tags = {
    Name = "NexaBank-EC2"
  }
}


