package com.joao_v_marques.dashboard_esg;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class DashboardEsgApplication {

	public static void main(String[] args) {
		SpringApplication.run(DashboardEsgApplication.class, args);
	}

}
