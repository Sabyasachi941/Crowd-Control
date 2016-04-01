package cc;

/**
 * Created by harryquigley on 01/04/2016.
 */


import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.orm.jpa.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@Configuration
@EnableAutoConfiguration
@EntityScan(basePackages = {"cc"})
@EnableJpaRepositories(basePackages = {"cc"})
@EnableTransactionManagement
public class RepositoryConfiguration {
}
