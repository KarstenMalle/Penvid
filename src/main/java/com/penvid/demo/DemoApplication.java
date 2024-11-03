package com.penvid.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import io.github.cdimascio.dotenv.Dotenv;

import java.util.Objects;

@SpringBootApplication
public class DemoApplication {

    public static void main(String[] args) {
        Dotenv dotenv = Dotenv.load();
        System.setProperty("SECURITY_USER_NAME", Objects.requireNonNull(dotenv.get("SECURITY_USER_NAME")));
        System.setProperty("SECURITY_USER_PASSWORD", Objects.requireNonNull(dotenv.get("SECURITY_USER_PASSWORD")));
        System.setProperty("DATABASE_URL", Objects.requireNonNull(dotenv.get("DATABASE_URL")));
        System.setProperty("DATABASE_USERNAME", Objects.requireNonNull(dotenv.get("DATABASE_USERNAME")));
        System.setProperty("DATABASE_PASSWORD", Objects.requireNonNull(dotenv.get("DATABASE_PASSWORD")));
        SpringApplication.run(DemoApplication.class, args);
    }

}
