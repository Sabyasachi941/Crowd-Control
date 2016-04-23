package cc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.web.SpringBootServletInitializer;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.ui.Model;
import org.springframework.cloud.aws.context.config.annotation.EnableContextCredentials;
import org.springframework.cloud.aws.context.config.annotation.EnableContextRegion;
import org.springframework.cloud.aws.jdbc.config.annotation.EnableRdsInstance;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.beans.factory.annotation.Value;

@Configuration
@ComponentScan
@EnableAutoConfiguration
@EnableJpaRepositories
@EnableRdsInstance(databaseName="ebdb", dbInstanceIdentifier="aa26q2nxcdc5te", username="Harry",password="${spring.aws.pass}")
@EnableContextCredentials(accessKey="AKIAJE46KTH4DUZDQMSQ", secretKey="${spring.aws.secKey}")
@EnableContextRegion(region="eu-west-1")



public class CcwebappApplication extends SpringBootServletInitializer {


    public static void main(String[] args) {
        SpringApplication.run(CcwebappApplication.class, args);
    }
    
    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(applicationClass);
    }



    private static Class<CcwebappApplication> applicationClass = CcwebappApplication.class;
}

