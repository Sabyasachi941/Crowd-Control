package cc;

/**
 * Created by harryquigley on 16/03/2016.
 */

import org.joda.time.DateTime;
import org.springframework.data.repository.PagingAndSortingRepository;
import org.springframework.data.rest.core.annotation.RepositoryRestResource;


//don't think below line is needed!
@RepositoryRestResource(collectionResourceRel = "timestamps", path = "timestamps")
public interface TimestampRepository extends PagingAndSortingRepository<Timestamp, Integer> {
    Integer findByInDay(Venue v,DateTime startDay, DateTime endDay);

    Integer findByLatestTimestamp(Venue v);


}
