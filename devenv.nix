{ pkgs, lib, config, ... }: {
  languages.python = {
    enable = true;
    package = pkgs.python311;
  };
  
  packages = with pkgs.python311Packages; [
    pip
    setuptools
    flask
    flask-cors
    flask-sqlalchemy
    sqlalchemy
    alembic
    python-dotenv
    requests
    pytest
    pytest-cov
    black
    flake8
  ];
}