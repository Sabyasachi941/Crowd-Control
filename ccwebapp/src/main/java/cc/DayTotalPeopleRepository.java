
package cc;

import org.joda.time.LocalDate;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Created by harryquigley on 25/04/2016.
 */
@RepositoryRestResource(collectionResourceRel = "dayTotalPeople", path = "dayTotalPeople")
public interface DayTotalPeopleRepository extends PagingAndSortingRepository <DayTotalPeople, Integer> {
    DayTotalPeople findByDateAndVenue(LocalDate d, Venue v);

    @Transactional
    @Modifying
    void updateTotal(Integer total, LocalDate d, Venue v);

    List <DayTotalPeople> findByVenue(Venue v);

    Integer findSumPeopleByVenueAndDateBetween(Venue v, LocalDate d1, LocalDate d2);

    List <Object[]> findMonthlyTotal(Venue v, LocalDate d1, LocalDate d2 );

    List <Object[]> findYearlyTotal(Venue v);
}
