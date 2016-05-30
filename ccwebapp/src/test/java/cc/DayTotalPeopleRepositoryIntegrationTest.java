package cc;


import com.github.springtestdbunit.DbUnitTestExecutionListener;
import com.github.springtestdbunit.annotation.DatabaseOperation;
import com.github.springtestdbunit.annotation.DatabaseSetup;
import com.github.springtestdbunit.annotation.DatabaseTearDown;
import com.github.springtestdbunit.annotation.DbUnitConfiguration;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
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
import cc.DayTotalPeopleRepository;
import cc.Venue;
import cc.VenueRepository;
import cc.MyObject;
import org.hibernate.engine.spi.PersistenceContext;
import org.springframework.test.context.web.WebAppConfiguration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Created by harryquigley on 15/05/2016.
 */
@DatabaseSetup(value = "classpath:datasets/it-daytotalpeople.xml")
@DbUnitConfiguration(databaseConnection="dataSource")
@TestExecutionListeners({DependencyInjectionTestExecutionListener.class,
        TransactionalTestExecutionListener.class, DbUnitTestExecutionListener.class})
@RunWith(SpringJUnit4ClassRunner.class)
@SpringApplicationConfiguration(classes = MvcConfig.class)
@WebAppConfiguration
@DirtiesContext

public class DayTotalPeopleRepositoryIntegrationTest {

    @Autowired
    private DayTotalPeopleRepository dayTotalPeopleRepository;

    LocalDate d1 = new LocalDate(2013,1,1);
    LocalDate d2 = new LocalDate(2015,12,31);
    LocalDate d3 = new LocalDate(2016,01,01);
    LocalDate d4 = new LocalDate(2016,12,31);

    Venue v1 = new Venue();
    Venue v2 = new Venue();
    Venue v3 = new Venue();
    Venue v4 = new Venue();

    @Test
    public void updateTotalShouldBeTen(){
        dayTotalPeopleRepository.updateTotal(10,d1,v1);
        assertThat(dayTotalPeopleRepository.findByVenue(v1).getTotalPeople())
                .isEqualTo(10);
    }

    @Test
    public void findSumPeopleByVenueAndDateBetweenShouldEqualTwenty(){
        assertThat(dayTotalPeopleRepository.findSumPeopleByVenueAndDateBetween(v1,d1,d2))
                .isEqualTo(20);
    }

    @Test
    public void findMonthlyTotalShouldContainThree(){
        List <Object[]> list = dayTotalPeopleRepository.findMonthlyTotal(v3,d3,d4);
        assertThat(list).hasSize(3);
        assertThat(list.get(0)).contains(50,1);
        assertThat(list.get(1)).contains(40,2);
        assertThat(list.get(2)).contains(10,3);

    }


    @Test
    public void findYearlyTotalShouldContainThreeYears(){
        List <Object[]> list2 = dayTotalPeopleRepository.findYearlyTotal(v4);
        assertThat(list2).hasSize(3);
        assertThat(list2.get(0)).contains(2014,250);
        assertThat(list2.get(1)).contains(2015,200);
        assertThat(list2.get(3)).contains(2016,250);
    }

}
