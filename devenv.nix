{ pkgs, lib, config, ... }: {
  languages.python = {
    enable = true;
    package = pkgs.python311;
  };
  
  # System packages for UI testing
  packages = with pkgs; [
    electron-chromedriver  # ChromeDriver for Selenium tests
    nodejs  # For JavaScript unit tests
    nodePackages.npm  # Package manager for JavaScript dependencies
  ] ++ (with pkgs.python311Packages; [
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
    autopep8
    isort
    selenium
  ]);
}