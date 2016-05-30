package cc;

import com.github.springtestdbunit.DbUnitTestExecutionListener;
import com.github.springtestdbunit.annotation.DatabaseOperation;
import com.github.springtestdbunit.annotation.DatabaseSetup;
import com.github.springtestdbunit.annotation.DatabaseTearDown;
import com.github.springtestdbunit.annotation.DbUnitConfiguration;
import org.joda.time.DateTime;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.SpringApplicationConfiguration;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestExecutionListeners;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;
import org.springframework.test.context.support.DependencyInjectionTestExecutionListener;
import org.springframework.test.context.support.DirtiesContextTestExecutionListener;
import org.springframework.test.context.transaction.TransactionalTestExecutionListener;
import cc.TimestampRepository;
import org.hibernate.engine.spi.PersistenceContext;
import org.springframework.test.context.web.WebAppConfiguration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Created by harryquigley on 15/05/2016.
 */
@DatabaseSetup(value = "classpath:datasets/it-timestamps.xml")
@DbUnitConfiguration(databaseConnection="dataSource")
@TestExecutionListeners({DependencyInjectionTestExecutionListener.class,
        TransactionalTestExecutionListener.class, DbUnitTestExecutionListener.class})
@RunWith(SpringJUnit4ClassRunner.class)
@SpringApplicationConfiguration(classes = MvcConfig.class)
@WebAppConfiguration
@DirtiesContext


public class TimestampRepositoryIntegrationTest {


    @Autowired
    private TimestampRepository timestampRepository;

    DateTime d1 = new DateTime(2013,1,1,0,0,0);
    DateTime d2 = new DateTime(2013,1,1,23,59,59);
    List<Timestamp> timestamps;
    Venue v1 = new Venue();
    Venue v2 = new Venue();
    Venue v3 = new Venue();
    Venue v4 = new Venue();

    @Test
    public void findByInDayShouldEqualTwo() {
        assertThat(timestampRepository.findByInDay(v1,d1,d2))
                .isEqualTo(2);
    }

    @Test
    public void findByLatestTimestampShouldReturnCurrentAttendanceOfNewestTs(){
        assertThat(timestampRepository.findByLatestTimestamp(v4))
                .isEqualTo(800);
    }


}


